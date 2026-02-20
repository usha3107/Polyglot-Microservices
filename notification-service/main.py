import os
from fastapi import FastAPI, Request
from opentelemetry import trace
from opentelemetry.sdk.resources import RESOURCE_ATTRIBUTES, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()

# OpenTelemetry Setup
resource = Resource(attributes={
    "service.name": os.getenv("SERVICE_NAME", "notification-service")
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=os.getenv("OTLP_EXPORTER_ENDPOINT", "http://jaeger:4317")))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

@app.get("/health")
async def health():
    return {"status": "UP"}

@app.post("/notify")
async def notify(request: Request):
    data = await request.json()
    email = data.get("email")
    order_id = data.get("orderId")
    
    with tracer.start_as_current_span("send_notification") as span:
        print(f"Sending notification to {email} for order {order_id}")
        span.set_attribute("notification.type", "email")
        span.set_attribute("notification.recipient", email)
        
        # Simulate notification sending
        return {"status": "SENT", "email": email}

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

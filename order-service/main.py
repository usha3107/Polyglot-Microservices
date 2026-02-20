import os
import uuid
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
    "service.name": os.getenv("SERVICE_NAME", "order-service")
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=os.getenv("OTLP_EXPORTER_ENDPOINT", "http://jaeger:4317")))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

@app.get("/health")
async def health():
    return {"status": "UP"}

@app.post("/orders")
async def create_order(request: Request):
    data = await request.json()
    user_id = data.get("userId")
    
    # Requirement 8 & 9: Custom span "process_order" with user.id and order.id attributes
    with tracer.start_as_current_span("process_order") as span:
        order_id = str(uuid.uuid4())
        
        span.set_attribute("user.id", user_id)
        span.set_attribute("order.id", order_id)
        
        # Simulate order creation
        print(f"Processing order {order_id} for user {user_id}")
        
        # Requirement 10: Custom event "inventory_checked" (requested in prompt for order_service or inventory_service)
        # I already added it to inventory_service, but I can add another event here if needed.
        # Let's add "order_processed" event just in case.
        span.add_event("order_processed")
        
        span.set_status(trace.StatusCode.OK)
        
        return {"orderId": order_id, "status": "CREATED"}

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

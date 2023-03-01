// Require dependencies
const opentelemetry = require("@opentelemetry/sdk-node");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { AWSXRayIdGenerator } = require("@opentelemetry/id-generator-aws-xray");
const { AWSXRayPropagator } = require("@opentelemetry/propagator-aws-xray");
const { BatchSpanProcessor} = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
// const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const _traceExporter = new OTLPTraceExporter({url: 'http://observability-collector.aws-otel-eks:4317'});
const _spanProcessor = new BatchSpanProcessor(_traceExporter);
const _tracerConfig = {
	idGenerator: new AWSXRayIdGenerator(),
}

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new opentelemetry.tracing.ConsoleSpanExporter(),
  instrumentations: [
	new HttpInstrumentation(),
	// getNodeAutoInstrumentations(),
  ],
  resource: new Resource({
	[SemanticResourceAttributes.SERVICE_NAME]: "skiapp",
  }),
  textMapPropagator: new AWSXRayPropagator(),
  spanProcessor: _spanProcessor,
  traceExporter: _traceExporter,
});

sdk.configureTracerProvider(_tracerConfig, _spanProcessor);

sdk.start()

import { version } from '../package.json';
import type { HandleClientError } from '@sveltejs/kit';
import { AxiosError } from 'axios';
import {
	getWebInstrumentations,
	initializeFaro,
	InternalLoggerLevel,
	LogLevel
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import clarity from '@microsoft/clarity';

const faro = initializeFaro({
	url: import.meta.env.VITE_FARO_DSN,
	app: {
		name: 'pocket-id-web',
		version,
		environment: import.meta.env.MODE
	},
	internalLoggerLevel: InternalLoggerLevel.WARN,
	sessionTracking: {
		samplingRate: 1,
		persistent: true
	},
	instrumentations: [
		...getWebInstrumentations(),
		new TracingInstrumentation({
			instrumentationOptions: {
				fetchInstrumentationOptions: {
					applyCustomAttributesOnSpan: (span, request, _response) => {
						const headers = new Headers(request.headers);
						if (!headers) {
							return;
						}

						const cfRay = headers.get('cf-ray')?.split('-');
						if (cfRay) {
							span.setAttribute('cloudflare.ray_id', cfRay[0]);
							span.setAttribute('cloudflare.colo', cfRay[1]);
						}
					}
				}
			}
		})
	]
});

clarity.init(import.meta.env.VITE_CLARITY_ID);

export const handleError: HandleClientError = async ({ error, message, status }) => {
	if (error instanceof AxiosError) {
		message = error.response?.data.error || message;
		status = error.response?.status || status;
		faro.api.pushLog(
			[`Axios error: ${error.request.path} - ${error.response?.data.error ?? error.message}`],
			{ level: LogLevel.ERROR }
		);
	} else {
		faro.api.pushError(error as Error);
	}

	return {
		message,
		status
	};
};

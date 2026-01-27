import { Trend, Rate } from 'k6/metrics';

export const customMessageDuration = new Trend('custom_message_duration');
export const customMessageErrors = new Rate('custom_message_errors');

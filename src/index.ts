'use strict';

import client, {Gauge, Registry} from 'prom-client'
import {
  circuitBreaker,
  CircuitBreakerPolicy,
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleAll,
  IDefaultPolicyContext,
  IMergedPolicy,
  IRetryContext,
  retry,
  RetryPolicy,
  wrap
} from 'cockatiel'

type PrometheusMetricsOptions = {
  application: string
  metricPrefix?: string
  maxAttempts?: number
  halfOpenAfter?: number;
}

export type CircuitBreakerType = IMergedPolicy<IRetryContext, RetryPolicy["_altReturn"], RetryPolicy extends IMergedPolicy<any, any, infer W> ? [RetryPolicy, ...W] : [RetryPolicy, RetryPolicy]> | IMergedPolicy<IDefaultPolicyContext, CircuitBreakerPolicy["_altReturn"], CircuitBreakerPolicy extends IMergedPolicy<any, any, infer W> ? [CircuitBreakerPolicy, ...W] : [CircuitBreakerPolicy, CircuitBreakerPolicy]>

export default class CockatielPrometheus {
  private _registry: Registry;
  private _metricPrefix: any;
  private _client: typeof import("/Users/a.thakur/workspace/cockatiel-prometheus/node_modules/prom-client/index");
  private _options: PrometheusMetricsOptions;
  private _circuitBreakers: {[key: string]: any};
  private _counter: Gauge;
  private _retryPolicy: RetryPolicy;
  private _circuitBreakerPolicy: CircuitBreakerPolicy;
  constructor (options: PrometheusMetricsOptions) {
    this._registry = client.register;
    this._metricPrefix = options.metricPrefix || ``;
    this._client = client;
    this._options = options;
    this._circuitBreakers = {};
    this._counter = new this._client.Gauge({
      name: `${this._metricPrefix}circuit`,
      help: `A count of all circuit' events`,
      registers: [this._registry],
      labelNames: ['name', 'event', 'application']
    });
    this._retryPolicy = retry(handleAll, { maxAttempts: options.maxAttempts || 3, backoff: new ExponentialBackoff() });
    this._circuitBreakerPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: (options.halfOpenAfter || 2) * 1000,
      breaker: new ConsecutiveBreaker(3),
    });
  }

  add (methodName: string): CircuitBreakerType {
    if (!this._circuitBreakers[methodName]) {
      this._circuitBreakers[methodName] = wrap(this._retryPolicy, this._circuitBreakerPolicy);
    }
    const circuitBreakerPolicy = this._circuitBreakers[methodName].wrapped[1]
    circuitBreakerPolicy.onHalfOpen(() => {
      this._counter.labels(methodName, 'halfOpen', this._options.application).set(1)
    })

    circuitBreakerPolicy.onBreak(() => {
      this._counter.labels(methodName, 'open', this._options.application).set(1)
    })

    circuitBreakerPolicy.onReset(() => {
      this._counter.labels(methodName, 'halfOpen', this._options.application).set(0)
      this._counter.labels(methodName, 'open', this._options.application).set(0)
    })

    circuitBreakerPolicy.onSuccess(() => {
      this._counter.labels(methodName, 'closed', this._options.application).set(1)
    })
    return this._circuitBreakers[methodName]
  }

  clear () {
    this._registry.clear();
  }

  metrics () {
    return this._registry.metrics();
  }

  get client () {
    return this._client;
  }
}

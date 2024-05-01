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
  metricPrefix?: string
  application: string
}

export type CircuitBreakerType = IMergedPolicy<IRetryContext, RetryPolicy["_altReturn"], RetryPolicy extends IMergedPolicy<any, any, infer W> ? [RetryPolicy, ...W] : [RetryPolicy, RetryPolicy]> | IMergedPolicy<IDefaultPolicyContext, CircuitBreakerPolicy["_altReturn"], CircuitBreakerPolicy extends IMergedPolicy<any, any, infer W> ? [CircuitBreakerPolicy, ...W] : [CircuitBreakerPolicy, CircuitBreakerPolicy]>

export default class CockatielPrometheus {
  private _registry: Registry;
  private _metricPrefix: any;
  private _client: typeof import("/Users/a.thakur/workspace/cockatiel-prometheus/node_modules/prom-client/index");
  private _options: PrometheusMetricsOptions;
  private _circuitBreakers: {[key: string]: any};
  private _counter: Gauge;
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
  }

  add (methodName: string): CircuitBreakerType {
    if (!this._circuitBreakers[methodName]) {
      const [retryPolicy, circuitBreakerPolicy] = this.createCircuitBreakerInstance()
      this._circuitBreakers[methodName] = wrap(retryPolicy, circuitBreakerPolicy);
    }
    const circuitBreakerPolicy = this._circuitBreakers[methodName].wrapped[1]
    circuitBreakerPolicy.onHalfOpen(() => {
      console.log('Half open state...')
      this._counter.labels(methodName, 'halfOpen', this._options.application).set(1)
    })

    circuitBreakerPolicy.onBreak(() => {
      console.log('Circuit is open...')
      this._counter.labels(methodName, 'open', this._options.application).set(1)
    })

    circuitBreakerPolicy.onReset(() => {
      console.log('Circuit is resetting...')
      this._counter.labels(methodName, 'halfOpen', this._options.application).set(0)
      this._counter.labels(methodName, 'open', this._options.application).set(0)
    })

    circuitBreakerPolicy.onSuccess(() => {
      console.log('Circuit is close...')
      this._counter.labels(methodName, 'closed', this._options.application).set(1)
    })
    return this._circuitBreakers[methodName]
  }

  createCircuitBreakerInstance(): (RetryPolicy|CircuitBreakerPolicy)[] {
    const retryPolicy = retry(handleAll, { maxAttempts: 10, backoff: new ExponentialBackoff() });
    const circuitBreakerPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: 2 * 1000,
      breaker: new ConsecutiveBreaker(3),
    });
    return [retryPolicy, circuitBreakerPolicy];
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

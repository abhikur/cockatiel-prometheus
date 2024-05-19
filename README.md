# cockatiel-prometheus - Prometheus metrics for cockatiel circuit breakers

### What is cockatiel-prometheus ?
This module provides Prometheus metrics for cockatiel circuit breakers. 

### How to Use it ?
Create an instance of CockatielPrometheus like below:

```export const cockatielPrometheus = new CockatielPrometheus({ application: 'your-service-name' })```

and then add your circuit breaker through its add method like below:

```cockatielPrometheus.add('async-function-name', you-cockatiel-circuit-breaker-policy)```

_Note:_ _Please pass the circuit breaker policy to add method provided by cockatiel library_

and to expose the metrics, you can use the following code:

```await cockatielPrometheus.metrics()```

That's it. You are done. Now you can see the metrics in your Prometheus server.

### Example

```typescript
import CockatielPrometheus from "./index";
import { circuitBreaker, retry, wrap } from 'cockatiel'

const yourServiceCircuitBreakerPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 5 * 1000,
  breaker: new ConsecutiveBreaker(3),
})

const yourServiceRetryPolicy = retry(handleAll, { maxAttempts: 10, backoff: new ExponentialBackoff() })

let cockatielPrometheus = new CockatielPrometheus({application: 'your-service-name'});

cockatielPrometheus.add('async-method-name', yourServiceCircuitBreakerPolicy);
const yourServiceCB = wrap(yourServiceRetryPolicy, yourServiceCircuitBreakerPolicy)

await yourServiceCB.execute(() => {
// your async method
})
```

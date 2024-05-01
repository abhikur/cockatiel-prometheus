# cockatiel-prometheus

### What is cockatiel-prometheus ?
cockatiel-prometheus is an integration between cockatiel and prometheus. This helps you to collect the circuit breaker logs which are coming from the cockatiel events and export them to your prometheus server.

### How to Use it ?

```typescript
import CockatielPrometheus, {CircuitBreakerType} from "./index";

let cockatielPrometheus = new CockatielPrometheus({application: 'your-service-name'});

let circuitBreaker: CircuitBreakerType = cockatielPrometheus.add('async-method-name');

// your async method
const handleRequest = async (circuitBreaker: CircuitBreakerType) => {
  async function delayedLogging(message: string, delay: number) {
    await new Promise(resolve => setTimeout(resolve, delay));
    console.log(message)
  }

  async function delayedError(errorMessage: string, delay: number) {
    await new Promise(resolve => setTimeout(resolve, delay));
    const error = new Error(errorMessage);
    throw {...error, statusCode: 500};
  }

  await circuitBreaker.execute(() => {
    if (Math.random() > 0.4) {
      delayedError('Something went wrong', 2000)
    } else {
      delayedLogging('Site is working again', 2000)
    }
  })
}

// calling the method to see it working
handleRequest(circuitBreaker).then(res => console.log(res))

```

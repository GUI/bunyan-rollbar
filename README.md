# bunyan-rollbar

If you're using [Bunyan](https://github.com/trentm/node-bunyan) for logging,
this custom stream can be used to send your error logs to
[Rollbar](https://rollbar.com).

## Example

```js
var bunyan = require('bunyan'),
    bunyanRollbar = require('bunyan-rollbar');

var logger = bunyan.createLogger({
  name: 'mylogger',
  streams: [
    {
      level: 'warn',
      type: 'raw', // Must be set to raw for use with BunyanRollbar
      stream: new bunyanRollbar.Stream({
        rollbarToken: 'YOUR_ROLLBAR_ACCESS_TOKEN',
        rollbarOptions: {} // Additional options to pass to rollbar.init()
      }),
    },
  ],
});
```

## Serializers

If you plan to use Bunyan's standard
[serializers](https://github.com/trentm/node-bunyan#serializers), it's
recommended you use the standard serializers from this library instead. You
should also overwrite `bunyan.stdSerializers.err` with the version from this
library. The serializers provided by this library include all the same standard
serializers as Bunyan, but are modified to retain the original error and
request objects so Rollbar can apply its own custom processing to those
specific types of objects.

```js
// Override
bunyan.stdSerializers.err = bunyanRollbar.stdSerializers.err;
var logger = bunyan.createLogger({
  name: 'mylogger',
  serializers: bunyanRollbar.stdSerializers,
})
```

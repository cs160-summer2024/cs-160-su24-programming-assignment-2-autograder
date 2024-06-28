To run these tests, first install [Node.js and NPM](https://nodejs.org/en/download) to your local computer.

Then, open a terminal to this directory (containing this README) and run:

```sh
npm install
npx playwright install --with-deps # this installs the web browser used to run the tests
```

This will install the necessary dependencies for these tests to run.

Then, run a static server at port `6160`, passing in the directory of your submission code:

```sh
npx serve -p 6160 /path/to/your/code
```

You can use any static server for this purpose (e.g. `python3 -m http.server`), as long as it's serving on port `6160`. Note that depending on your server configuration, this may expose your served directory to others on your network (including on eduroam).

Finally, in a new terminal opened to this directory (containing this README), run the tests:

```sh
npx playwright test
# or, alternatively:
npx playwright test --headed # to see the browser window during the test run
npx playwright test --ui # to manually control the test run in a dedicated debugger window (you'll need to press the 'Run' button to start the tests)
```

When the tests have finished running, you'll see a command that can be used to view the report in a browser:

```sh
npx playwright show-report outputs/html-report
```

See the [Playwright documentation](https://playwright.dev/docs/running-tests) for more information on running tests.

## Step 1: echo check

```verify
- id: echo-ok
  kind: assert
  requirement: "AC-1: echoes"
  run: echo hello
  expect: contains: hello
- id: copy-tone
  kind: judge
  requirement: "AC-2: tone"
  ask: "Is the tone friendly?"
  evidence: [command: echo sample-evidence]
```

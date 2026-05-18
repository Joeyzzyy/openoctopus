# OpenOctopus CLI

Official command-line interface for OpenOctopus.

```bash
npm i -g @openoctopus/cli
ooct auth login
ooct models
ooct run openoctopus/image-captioner-molmo2 --image ./input.png --detail-level low
```

The CLI discovers supported models from the OpenOctopus model manifest at runtime, so newly published Playground/API capabilities can be used without changing the CLI.

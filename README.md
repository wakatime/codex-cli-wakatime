# Codex CLI WakaTime

[WakaTime][wakatime] plugin for [Codex CLI][codex-cli].

The plugin installs [wakatime-cli][wakatime-cli] into `~/.wakatime/`, checks for wakatime-cli updates on session start, and syncs AI heartbeats after user prompts and file-edit tool events.

## Install

```sh
codex plugin marketplace add wakatime/codex-cli-wakatime
codex plugin add codex-cli-wakatime@wakatime
```

## Configuration

The plugin reads standard WakaTime settings from `~/.wakatime.cfg`.

Useful settings:

```ini
[settings]
api_key = XXXX
debug = true
proxy = https://user:pass@example.com:8080
```

Logs are written to `~/.wakatime/codex-cli.log`.

[wakatime]: https://wakatime.com/
[codex-cli]: https://developers.openai.com/codex/cli
[wakatime-cli]: https://github.com/wakatime/wakatime-cli

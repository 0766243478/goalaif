FROM ghcr.io/foundry-rs/foundry:latest

RUN pip3 install slither-analyzer --break-system-packages

RUN apk add --no-cache nodejs npm

WORKDIR /workspace

ENTRYPOINT ["sh", "-c"]

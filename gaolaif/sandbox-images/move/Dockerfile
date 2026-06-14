FROM ubuntu:22.04

RUN apt-get update && apt-get install -y curl git build-essential

RUN curl -fsSL https://get.sui.io | bash

RUN curl -fsSL https://aptos.dev/scripts/install_cli.py | python3

ENV PATH="/root/.cargo/bin:/root/.sui/bin:$PATH"

WORKDIR /workspace

ENTRYPOINT ["sh", "-c"]

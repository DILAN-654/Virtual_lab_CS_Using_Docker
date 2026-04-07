# Python Dev Lab
FROM python:3.11-slim

# Install common dev tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       git \
       curl \
       wget \
       vim \
       ca-certificates \
       python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG USER=student
ARG UID=1000
RUN useradd -m -u ${UID} ${USER} && mkdir -p /home/${USER}/workspace && chown -R ${USER}:${USER} /home/${USER}

WORKDIR /home/${USER}/workspace

# Install useful Python packages globally for labs (can be overridden by venv)
RUN pip install --no-cache-dir black pytest requests

# Drop to less-privileged user
USER ${USER}

ENV PATH="/home/${USER}/.local/bin:${PATH}"

CMD ["/bin/bash"]

# Node.js Dev Lab
FROM node:20-slim

# Install common dev tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       git \
       curl \
       wget \
       vim \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG USER=student
ARG UID=1000
RUN useradd -m -u ${UID} ${USER} && mkdir -p /home/${USER}/workspace && chown -R ${USER}:${USER} /home/${USER}

WORKDIR /home/${USER}/workspace

# Install some global dev tools
RUN npm install -g npm@latest yarn

USER ${USER}

CMD ["/bin/bash"]

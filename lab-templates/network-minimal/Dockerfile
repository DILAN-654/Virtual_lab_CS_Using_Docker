# Minimal Networking Lab
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       iproute2 \
       iputils-ping \
       net-tools \
       traceroute \
       dnsutils \
       tcpdump \
       curl \
       wget \
       vim \
       sudo \
    && rm -rf /var/lib/apt/lists/*

# Create student user
ARG USER=student
ARG UID=1000
RUN useradd -m -u ${UID} ${USER} && mkdir -p /home/${USER}/workspace && chown -R ${USER}:${USER} /home/${USER}

WORKDIR /home/${USER}/workspace

USER ${USER}

CMD ["/bin/bash"]

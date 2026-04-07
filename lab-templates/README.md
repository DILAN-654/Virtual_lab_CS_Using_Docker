Lab Templates - Virtual Lab Workbench

This folder contains Docker-based lab templates that can be used as the starting point for student lab environments.

Templates in this folder:
- `python-dev` - Python development image with Python 3.11 and common tools.
- `node-dev` - Node.js development image with Node 20, npm, and yarn.
- `network-minimal` - Ubuntu-based image with `iproute2`, `net-tools`, `tcpdump`, and `traceroute`.

Programming-language presets available in the admin dashboard:
- Python
- JavaScript
- Java
- C
- C++
- Networking

Image sources:
- Python and JavaScript use the local Dockerfiles in this folder.
- Java uses the official `eclipse-temurin:21` image.
- C and C++ use the official `gcc:13` image.
- Networking uses the local `network-minimal` Dockerfile.

Build (Linux/macOS)
```bash
cd lab-templates
chmod +x build.sh
./build.sh
```

Build (Windows PowerShell)
```powershell
cd lab-templates
.\build.ps1
```

Local testing
-------------
Run an interactive container with a mounted workspace for persistence:

```bash
docker run --rm -it -v /path/to/local/workspace:/home/student/workspace -p 8888:8888 --name lab-python virtual-lab/python-dev:latest
```

Registry and tags
-----------------
- Images built from this folder use the `virtual-lab/` prefix.
- Example push flow:

```bash
docker tag virtual-lab/python-dev:latest my-registry.example.com/virtual-lab/python-dev:v1
docker push my-registry.example.com/virtual-lab/python-dev:v1
```

Suggested next steps
--------------------
- Add starter files for each lab topic in `/home/student/workspace`.
- Tune CPU, memory, and storage per lab template in the backend.
- Connect these templates to lab records so tasks can launch the right environment automatically.

Security note
-------------
- The local images run a non-root `student` user by default, but every image should still be reviewed before production use.
- Avoid mounting sensitive host paths into containers.

// Seed script to populate LabTemplate collection with local templates
require('dotenv').config();
const mongoose = require('mongoose');
const LabTemplate = require('../models/LabTemplate');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        // Clear existing templates with same names
        await LabTemplate.deleteMany({});

        const templates = [
            {
                name: 'Python Programming Lab',
                description: 'Python 3 development environment for scripting, problem solving, and foundational programming labs.',
                dockerImage: 'virtual-lab/python-dev:latest',
                defaultCommand: ['/bin/bash'],
                category: 'programming',
                resources: { cpu: 1, memory: '512MB', storage: '5GB' },
                ports: [],
                exampleFiles: [
                    {
                        filePath: 'main.py',
                        content: "print('Hello from the Python lab')\n"
                    }
                ],
                isActive: true
            },
            {
                name: 'JavaScript Programming Lab',
                description: 'Node.js environment for JavaScript practice, algorithms, and console-based programming exercises.',
                dockerImage: 'virtual-lab/node-dev:latest',
                defaultCommand: ['/bin/bash'],
                category: 'programming',
                resources: { cpu: 1, memory: '512MB', storage: '5GB' },
                ports: [],
                exampleFiles: [
                    {
                        filePath: 'main.js',
                        content: "console.log('Hello from the JavaScript lab');\n"
                    }
                ],
                isActive: true
            },
            {
                name: 'Java Programming Lab',
                description: 'Java 21 development environment for OOP, collections, and command-line programming tasks.',
                dockerImage: 'eclipse-temurin:21',
                defaultCommand: ['/bin/bash'],
                category: 'programming',
                resources: { cpu: 1, memory: '1GB', storage: '5GB' },
                ports: [],
                exampleFiles: [
                    {
                        filePath: 'Main.java',
                        content: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from the Java lab\");\n    }\n}\n"
                    }
                ],
                isActive: true
            },
            {
                name: 'C Programming Lab',
                description: 'GCC-based lab template for structured programming, arrays, functions, and pointers.',
                dockerImage: 'gcc:13',
                defaultCommand: ['/bin/bash'],
                category: 'programming',
                resources: { cpu: 1, memory: '512MB', storage: '4GB' },
                ports: [],
                exampleFiles: [
                    {
                        filePath: 'main.c',
                        content: "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello from the C lab\\n\");\n    return 0;\n}\n"
                    }
                ],
                isActive: true
            },
            {
                name: 'C++ Programming Lab',
                description: 'Modern C++ template for STL practice, object-oriented programming, and algorithms.',
                dockerImage: 'gcc:13',
                defaultCommand: ['/bin/bash'],
                category: 'programming',
                resources: { cpu: 1, memory: '512MB', storage: '4GB' },
                ports: [],
                exampleFiles: [
                    {
                        filePath: 'main.cpp',
                        content: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello from the C++ lab\" << std::endl;\n    return 0;\n}\n"
                    }
                ],
                isActive: true
            },
            {
                name: 'Network Fundamentals Lab',
                description: 'Ubuntu-based image with networking tools such as iproute2, tcpdump, net-tools, and traceroute.',
                dockerImage: 'virtual-lab/network-minimal:latest',
                defaultCommand: ['/bin/bash'],
                category: 'networking',
                resources: { cpu: 1, memory: '512MB', storage: '2GB' },
                ports: [],
                isActive: true
            }
        ];

        const created = await LabTemplate.insertMany(templates);
        console.log(`Created ${created.length} lab templates`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding lab templates:', err);
        process.exit(1);
    }
}

seed();

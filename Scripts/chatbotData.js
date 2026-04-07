(function (global) {
    function buildCodeResponse(title, languageLabel, fenceLanguage, code, notes) {
        let response = `### ${title} in ${languageLabel}\n\n\`\`\`${fenceLanguage}\n${code}\n\`\`\``;

        if (Array.isArray(notes) && notes.length) {
            response += `\n\n${notes.map((note) => `- ${note}`).join('\n')}`;
        }

        return response;
    }

    const chatbotData = [
        {
            id: 'greeting',
            type: 'text',
            priority: 10,
            keywords: [['hello'], ['hi'], ['hey']],
            response: 'Hello! I am your offline Virtual Lab assistant. Ask for code like `factorial python`, `fibonacci java`, `palindrome c`, `prime javascript`, `vote python`, `reverse string java`, or `calculator c++`.'
        },
        {
            id: 'identity',
            type: 'text',
            priority: 10,
            keywords: [['who', 'you'], ['what', 'can', 'you', 'do']],
            response: 'I work fully offline using a predefined programming help dataset. I can return code snippets, basic debugging tips, Docker help, and lab usage guidance without any API.'
        },
        {
            id: 'run-help',
            type: 'text',
            priority: 12,
            keywords: [['how', 'run', 'code'], ['program', 'not', 'running'], ['run', 'button']],
            response: 'Use the `Run` button to execute your program. If your code needs input, type it in the Standard Input box and run again. The terminal panel will show input, output, and errors together.'
        },
        {
            id: 'syntax-error',
            type: 'text',
            priority: 14,
            keywords: [['syntax', 'error'], ['missing', 'semicolon'], ['undeclared', 'variable'], ['type', 'mismatch']],
            response: 'Syntax and compile errors usually come from missing semicolons, wrong brackets, undeclared variables, or type mismatches. Read the first error line carefully because later errors are often side effects.'
        },
        {
            id: 'runtime-error',
            type: 'text',
            priority: 14,
            keywords: [['runtime', 'error'], ['segmentation', 'fault'], ['null', 'pointer'], ['division', 'zero'], ['wrong', 'output'], ['infinite', 'loop']],
            response: 'Check array bounds, null values, loop conditions, and divide operations. If the program compiles but fails at runtime, inspect the exact input and the first failing line in the console.'
        },
        {
            id: 'docker-help',
            type: 'text',
            priority: 12,
            keywords: [['what', 'docker'], ['docker', 'error'], ['container', 'not', 'running'], ['why', 'docker', 'used']],
            response: 'Docker runs code inside isolated containers so programs behave consistently across systems. If a container is not running, restart it and inspect logs to see the startup error.'
        },
        {
            id: 'submit-help',
            type: 'text',
            priority: 12,
            keywords: [['how', 'submit'], ['view', 'result'], ['check', 'submissions']],
            response: 'Run your code first, review the terminal output, then use the `Submit` button for assigned tasks or `Save to My Labs` for practice work.'
        },
        {
            id: 'factorial-python',
            type: 'code',
            topic: 'factorial',
            language: 'python',
            priority: 100,
            keywords: [['factorial', 'python'], ['factorial', 'py']],
            response: buildCodeResponse(
                'Factorial',
                'Python',
                'python',
                [
                    'def factorial(n):',
                    '    result = 1',
                    '    for i in range(2, n + 1):',
                    '        result *= i',
                    '    return result',
                    '',
                    'n = int(input("Enter a number: "))',
                    'print("Factorial =", factorial(n))'
                ].join('\n'),
                ['Uses standard input, so it runs directly in the editor terminal.']
            )
        },
        {
            id: 'fibonacci-java',
            type: 'code',
            topic: 'fibonacci',
            language: 'java',
            priority: 100,
            keywords: [['fibonacci', 'java'], ['fib', 'java']],
            response: buildCodeResponse(
                'Fibonacci Series',
                'Java',
                'java',
                [
                    'import java.util.Scanner;',
                    '',
                    'public class Main {',
                    '    public static void main(String[] args) {',
                    '        Scanner sc = new Scanner(System.in);',
                    '        int n = sc.nextInt();',
                    '        int a = 0;',
                    '        int b = 1;',
                    '',
                    '        for (int i = 0; i < n; i++) {',
                    '            System.out.print(a + (i < n - 1 ? " " : ""));',
                    '            int next = a + b;',
                    '            a = b;',
                    '            b = next;',
                    '        }',
                    '    }',
                    '}'
                ].join('\n'),
                ['Enter the number of terms through standard input.']
            )
        },
        {
            id: 'palindrome-c',
            type: 'code',
            topic: 'palindrome',
            language: 'c',
            priority: 100,
            keywords: [['palindrome', 'c']],
            response: buildCodeResponse(
                'Palindrome Check',
                'C',
                'c',
                [
                    '#include <stdio.h>',
                    '#include <string.h>',
                    '',
                    'int main() {',
                    '    char str[100];',
                    '    int isPalindrome = 1;',
                    '',
                    '    scanf("%99s", str);',
                    '    int len = (int)strlen(str);',
                    '',
                    '    for (int i = 0; i < len / 2; i++) {',
                    '        if (str[i] != str[len - 1 - i]) {',
                    '            isPalindrome = 0;',
                    '            break;',
                    '        }',
                    '    }',
                    '',
                    '    if (isPalindrome) {',
                    '        printf("Palindrome\\n");',
                    '    } else {',
                    '        printf("Not Palindrome\\n");',
                    '    }',
                    '',
                    '    return 0;',
                    '}'
                ].join('\n'),
                ['Reads one word from input and checks whether it is a palindrome.']
            )
        },
        {
            id: 'prime-javascript',
            type: 'code',
            topic: 'prime',
            language: 'javascript',
            priority: 100,
            keywords: [['prime', 'javascript'], ['prime', 'js']],
            response: buildCodeResponse(
                'Prime Number Check',
                'JavaScript',
                'javascript',
                [
                    'const fs = require("fs");',
                    'const input = fs.readFileSync(0, "utf8").trim();',
                    'const n = Number(input);',
                    '',
                    'function isPrime(num) {',
                    '    if (num <= 1) return false;',
                    '    for (let i = 2; i * i <= num; i++) {',
                    '        if (num % i === 0) return false;',
                    '    }',
                    '    return true;',
                    '}',
                    '',
                    'console.log(isPrime(n) ? "Prime" : "Not Prime");'
                ].join('\n'),
                ['This version reads input from standard input so it works in Node.js.']
            )
        },
        {
            id: 'vote-python',
            type: 'code',
            topic: 'vote',
            language: 'python',
            priority: 100,
            keywords: [['vote', 'python'], ['voting', 'python'], ['eligible', 'vote', 'python']],
            response: buildCodeResponse(
                'Voting Eligibility',
                'Python',
                'python',
                [
                    'age = int(input("Enter age: "))',
                    '',
                    'if age >= 18:',
                    '    print("Eligible to vote")',
                    'else:',
                    '    print("Not eligible to vote")'
                ].join('\n'),
                ['A simple if-else example for age-based eligibility.']
            )
        },
        {
            id: 'reverse-string-java',
            type: 'code',
            topic: 'reverse string',
            language: 'java',
            priority: 100,
            keywords: [['reverse', 'string', 'java'], ['string', 'reverse', 'java']],
            response: buildCodeResponse(
                'Reverse String',
                'Java',
                'java',
                [
                    'import java.util.Scanner;',
                    '',
                    'public class Main {',
                    '    public static void main(String[] args) {',
                    '        Scanner sc = new Scanner(System.in);',
                    '        String text = sc.nextLine();',
                    '        String reversed = new StringBuilder(text).reverse().toString();',
                    '        System.out.println(reversed);',
                    '    }',
                    '}'
                ].join('\n'),
                ['Reads a full line and reverses it using StringBuilder.']
            )
        },
        {
            id: 'calculator-cpp',
            type: 'code',
            topic: 'calculator',
            language: 'cpp',
            priority: 100,
            keywords: [['calculator', 'cpp'], ['calculator', 'c++'], ['calc', 'cpp'], ['calc', 'c++']],
            response: buildCodeResponse(
                'Simple Calculator',
                'C++',
                'cpp',
                [
                    '#include <iostream>',
                    'using namespace std;',
                    '',
                    'int main() {',
                    '    double a, b;',
                    '    char op;',
                    '',
                    '    cin >> a >> op >> b;',
                    '',
                    '    switch (op) {',
                    '        case \'+\': cout << (a + b) << endl; break;',
                    '        case \'-\': cout << (a - b) << endl; break;',
                    '        case \'*\': cout << (a * b) << endl; break;',
                    '        case \'/\':',
                    '            if (b != 0) cout << (a / b) << endl;',
                    '            else cout << "Division by zero error" << endl;',
                    '            break;',
                    '        default:',
                    '            cout << "Invalid operator" << endl;',
                    '    }',
                    '',
                    '    return 0;',
                    '}'
                ].join('\n'),
                ['Input format example: `12 + 5`']
            )
        },
        {
            id: 'factorial-generic',
            type: 'suggestion',
            topic: 'factorial',
            priority: 20,
            keywords: [['factorial']],
            response: 'I have a ready factorial example available.',
            suggestions: ['factorial python']
        },
        {
            id: 'fibonacci-generic',
            type: 'suggestion',
            topic: 'fibonacci',
            priority: 20,
            keywords: [['fibonacci'], ['fib']],
            response: 'I have a ready Fibonacci example available.',
            suggestions: ['fibonacci java']
        },
        {
            id: 'palindrome-generic',
            type: 'suggestion',
            topic: 'palindrome',
            priority: 20,
            keywords: [['palindrome']],
            response: 'I have a ready palindrome example available.',
            suggestions: ['palindrome c']
        },
        {
            id: 'prime-generic',
            type: 'suggestion',
            topic: 'prime',
            priority: 20,
            keywords: [['prime']],
            response: 'I have a ready prime-number example available.',
            suggestions: ['prime javascript']
        },
        {
            id: 'vote-generic',
            type: 'suggestion',
            topic: 'vote',
            priority: 20,
            keywords: [['vote'], ['voting'], ['eligible', 'vote']],
            response: 'I have a ready voting eligibility example available.',
            suggestions: ['vote python']
        },
        {
            id: 'reverse-string-generic',
            type: 'suggestion',
            topic: 'reverse string',
            priority: 20,
            keywords: [['reverse', 'string'], ['string', 'reverse']],
            response: 'I have a ready reverse-string example available.',
            suggestions: ['reverse string java']
        },
        {
            id: 'calculator-generic',
            type: 'suggestion',
            topic: 'calculator',
            priority: 20,
            keywords: [['calculator'], ['calc']],
            response: 'I have a ready calculator example available.',
            suggestions: ['calculator c++']
        }
    ];

    global.chatbotData = chatbotData;
    global.chatbotFallbackMessage = 'Sorry, I could not find an offline answer for that. Try prompts like `factorial python`, `fibonacci java`, `palindrome c`, `prime javascript`, `vote python`, `reverse string java`, or `calculator c++`.';
})(window);

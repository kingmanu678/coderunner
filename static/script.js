// User profile dropdown functionality
const userProfile = document.getElementById('user-profile');
const dropdownMenu = document.querySelector('.dropdown-menu');

// Add hover effect and smooth transition
userProfile.addEventListener('mouseenter', () => {
    userProfile.classList.add('hover');
});

userProfile.addEventListener('mouseleave', () => {
    userProfile.classList.remove('hover');
});

userProfile.addEventListener('click', (e) => {
    e.stopPropagation();
    userProfile.classList.toggle('active');
    
    // Add animation to dropdown
    if (userProfile.classList.contains('active')) {
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.display = 'block';
        setTimeout(() => {
            dropdownMenu.style.opacity = '1';
            dropdownMenu.style.transform = 'translateY(0)';
        }, 50);
    } else {
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            dropdownMenu.style.display = 'none';
        }, 300);
    }
});

// Close dropdown when clicking outside with improved UX
document.addEventListener('click', () => {
    if (userProfile.classList.contains('active')) {
        userProfile.classList.remove('active');
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            dropdownMenu.style.display = 'none';
        }, 300);
    }
});

// Handle logout click with visual feedback
const logoutLink = document.querySelector('.dropdown-item');
if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
        // Add visual feedback when clicking logout
        logoutLink.classList.add('clicked');
        setTimeout(() => {
            // Let the default link behavior work
            // The URL is now correct in the HTML template: {{ url_for('logout') }}
        }, 300);
    });
}

// Prevent dropdown from closing when clicking inside it
dropdownMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Add hover effects to dropdown items
const dropdownItems = document.querySelectorAll('.dropdown-item');
dropdownItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.classList.add('hover');
    });
    
    item.addEventListener('mouseleave', () => {
        item.classList.remove('hover');
    });
});

const defaultCodes = {
    'python': 'print("Hello, World!")',
    'cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    'java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    'javascript': 'console.log("Hello, World!");'
};

const editor = CodeMirror(document.getElementById('editor'), {
    mode: 'python',
    lineNumbers: true,
    value: defaultCodes['python'],
    theme: 'monokai',
    lineWrapping: true,
    indentUnit: 4,
    smartIndent: true,
    autofocus: true
});

// Load saved code and language on page load
const savedCode = localStorage.getItem('savedCode');
const savedLanguage = localStorage.getItem('savedLanguage');
if (savedCode && savedLanguage) {
    editor.setValue(savedCode);
    document.getElementById('language-select').value = savedLanguage;
    editor.setOption('mode', savedLanguage === 'cpp' || savedLanguage === 'java' ? 'clike' : savedLanguage);
}

// Language selection functionality
const languageSelect = document.getElementById('language-select');
const javaClassInput = document.getElementById('java-class-name');

javaClassInput.style.display = 'none';

languageSelect.addEventListener('change', (e) => {
    const lang = e.target.value;
    
    // Set the appropriate mode for the language
    editor.setOption('mode', lang === 'cpp' || lang === 'java' ? 'clike' : lang);
    
    // Set the boilerplate code
    editor.setValue(defaultCodes[lang]);
    
    // Show/hide Java class name input
    javaClassInput.style.display = lang === 'java' ? 'block' : 'none';
    
    // Save the selected language
    localStorage.setItem('savedLanguage', lang);
});

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.querySelector('.theme-label');

// Set initial state
themeToggle.checked = document.body.classList.contains('dark');
themeLabel.textContent = themeToggle.checked ? 'Dark Mode' : 'Light Mode';

themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
    editor.setOption('theme', themeToggle.checked ? 'monokai' : 'default');
    themeLabel.textContent = themeToggle.checked ? 'Dark Mode' : 'Light Mode';
});

async function runCode() {
    const runButton = document.getElementById('run-button');
    runButton.disabled = true;
    runButton.classList.add('loading');
    runButton.innerText = 'Running';

    const code = editor.getValue();
    const language = document.getElementById('language-select').value;
    const inputText = document.getElementById('input-box').value;
    const javaClassName = document.getElementById('java-class-name').value || '';
    const outputElement = document.getElementById('output');
    
    try {
        // Special Python wrapper to handle input properly
        let wrappedCode = code;
        if (language === 'python') {
            const inputs = inputText.split('\n').filter(line => line.trim() !== '');
            wrappedCode = `
# Custom input handler
original_input = input
input_values = ${JSON.stringify(inputs)}
input_index = 0

def custom_input(prompt=''):
    global input_index
    print(prompt)  # Print the prompt
    if input_index < len(input_values):
        value = input_values[input_index]
        print(value)  # Print the input value
        input_index += 1
        return value
    return ""

input = custom_input

# Original code starts here
${code}
`;
        }
        
        const response = await fetch('/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                code: wrappedCode, 
                language, 
                input: '', // We're handling inputs in the wrapped code
                javaClassName 
            })
        });
        
        const result = await response.json();
        outputElement.innerText = result.output.trim();
        
        if (result.output.toLowerCase().includes('error')) {
            outputElement.classList.add('error');
            outputElement.classList.remove('success');
        } else {
            outputElement.classList.add('success');
            outputElement.classList.remove('error');
        }
    } catch (error) {
        outputElement.innerText = "Error: " + error.message;
        outputElement.classList.add('error');
        outputElement.classList.remove('success');
    } finally {
        runButton.disabled = false;
        runButton.classList.remove('loading');
        runButton.innerText = 'Run Code';
    }
}

document.getElementById('run-button').addEventListener('click', runCode);

function updateFontSize(size) {
    editor.getWrapperElement().style.fontSize = `${size}px`;
    editor.refresh();
}

document.getElementById('font-size').addEventListener('change', (e) => {
    updateFontSize(e.target.value);
});

// Save code with improved feedback
document.getElementById('save-button').addEventListener('click', () => {
    const code = editor.getValue();
    const language = document.getElementById('language-select').value;
    localStorage.setItem('savedCode', code);
    localStorage.setItem('savedLanguage', language);
    
    const saveButton = document.getElementById('save-button');
    const originalText = saveButton.innerText;
    saveButton.innerText = 'Saved!';
    saveButton.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
    
    setTimeout(() => {
        saveButton.innerText = originalText;
        saveButton.style.background = 'linear-gradient(45deg, #007bff, #00bcd4)';
    }, 1500);
});
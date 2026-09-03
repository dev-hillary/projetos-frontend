/**
 * Lógica da Calculadora Web
 * Desenvolvido por: Hillary Alcântara
 */

class Calculator {
    constructor(previousOperandTextElement, currentOperandTextElement) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.clear();
    }

    // Limpa todas as variáveis e reseta a calculadora
    clear() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.operation = undefined;
    }

    // Apaga o último caractere digitado
    delete() {
        if (this.currentOperand === '0') return;
        if (this.currentOperand.length === 1) {
            this.currentOperand = '0';
        } else {
            this.currentOperand = this.currentOperand.toString().slice(0, -1);
        }
    }

    // Adiciona um número ou ponto decimal ao display
    appendNumber(number) {
        // Impede adicionar múltiplos pontos decimais
        if (number === '.' && this.currentOperand.includes('.')) return;
        
        // Evita zeros à esquerda desnecessários
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number.toString();
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
    }

    // Define a operação matemática escolhida
    chooseOperation(operation) {
        if (this.currentOperand === '' && this.previousOperand === '') return;
        
        // Se já houver uma operação pendente, calcula primeiro
        if (this.previousOperand !== '') {
            this.compute();
        }

        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '0';
    }

    // Executa os cálculos com tratamento de erros
    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);

        if (isNaN(prev) || isNaN(current)) return;

        switch (this.operation) {
            case '+':
                computation = prev + current;
                break;
            case '-':
                computation = prev - current;
                break;
            case '×':
            case '*':
                computation = prev * current;
                break;
            case '÷':
            case '/':
                if (current === 0) {
                    alert("Erro: Divisão por zero não é permitida!");
                    this.clear();
                    this.updateDisplay();
                    return;
                }
                computation = prev / current;
                break;
            case '%':
                computation = (prev * current) / 100;
                break;
            default:
                return;
        }

        // Arredonda para evitar problemas de precisão com números decimais em JS
        this.currentOperand = Math.round(computation * 1000000) / 1000000;
        this.operation = undefined;
        this.previousOperand = '';
    }

    // Formata o número para exibir vírgulas e pontos corretamente no padrão brasileiro
    getDisplayNumber(number) {
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay;

        if (isNaN(integerDigits)) {
            integerDisplay = '';
        } else {
            integerDisplay = integerDigits.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        }

        if (decimalDigits != null) {
            return `${integerDisplay},${decimalDigits}`;
        } else {
            return integerDisplay;
        }
    }

    // Atualiza a interface gráfica da calculadora
    updateDisplay() {
        this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
        if (this.operation != null) {
            this.previousOperandTextElement.innerText = 
                `${this.getDisplayNumber(this.previousOperand)} ${this.operation}`;
        } else {
            this.previousOperandTextElement.innerText = '';
        }
    }
}

// --- INICIALIZAÇÃO E MAPEAMENTO DOS ELEMENTOS ---
const previousOperandTextElement = document.getElementById('previous-operand');
const currentOperandTextElement = document.getElementById('current-operand');

const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement);

// Eventos dos Botões da Calculadora
document.querySelectorAll('[data-number]').forEach(button => {
    button.addEventListener('click', () => {
        calculator.appendNumber(button.getAttribute('data-number'));
        calculator.updateDisplay();
    });
});

document.querySelectorAll('[data-operator]').forEach(button => {
    button.addEventListener('click', () => {
        calculator.chooseOperation(button.getAttribute('data-operator'));
        calculator.updateDisplay();
    });
});

document.querySelector('[data-action="calculate"]').addEventListener('click', () => {
    calculator.compute();
    calculator.updateDisplay();
});

document.querySelector('[data-action="clear"]').addEventListener('click', () => {
    calculator.clear();
    calculator.updateDisplay();
});

document.querySelector('[data-action="delete"]').addEventListener('click', () => {
    calculator.delete();
    calculator.updateDisplay();
});

// --- SUPORTE A ATALHOS DO TECLADO ---
document.addEventListener('keydown', (e) => {
    if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === ',') {
        calculator.appendNumber(e.key === ',' ? '.' : e.key);
    } else if (e.key === '+' || e.key === '-') {
        calculator.chooseOperation(e.key);
    } else if (e.key === '*') {
        calculator.chooseOperation('×');
    } else if (e.key === '/') {
        calculator.chooseOperation('÷');
    } else if (e.key === '%') {
        calculator.chooseOperation('%');
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculator.compute();
    } else if (e.key === 'Backspace') {
        calculator.delete();
    } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        calculator.clear();
    }
    calculator.updateDisplay();
});
import SwiftUI

enum CalculatorButton: String {
    case one = "1", two = "2", three = "3", four = "4", five = "5", six = "6", seven = "7", eight = "8", nine = "9", zero = "0"
    case add = "+", subtract = "-", multiply = "×", divide = "÷", equal = "="
    case clear = "AC", decimal = ".", percent = "%", negative = "±"

    var buttonColor: Color {
        switch self {
        case .add, .subtract, .multiply, .divide, .equal:
            return .orange
        case .clear, .negative, .percent:
            return Color.white.opacity(0.2)
        default:
            return Color(white: 0.2)
        }
    }
    
    var textColor: Color {
        switch self {
        case .clear, .negative, .percent:
            return .black
        default:
            return .white
        }
    }
}

struct ContentView: View {
    @State private var displayText = "0"
    @State private var runningNumber = 0.0
    @State private var currentOperation: CalculatorButton? = nil
    @State private var isUserTyping = false
    @State private var animateGradient = false

    let buttons: [[CalculatorButton]] = [
        [.clear, .negative, .percent, .divide],
        [.seven, .eight, .nine, .multiply],
        [.four, .five, .six, .subtract],
        [.one, .two, .three, .add],
        [.zero, .decimal, .equal]
    ]

    var body: some View {
        ZStack {
            // خلفية سائلة (Liquid Gradient)
            LinearGradient(gradient: Gradient(colors: [Color.purple, Color.blue, Color.black]), 
                           startPoint: .topLeading, 
                           endPoint: .bottomTrailing)
                .ignoresSafeArea()
            
            // دوائر خلفية لإظهار تأثير الزجاج
            Circle()
                .fill(Color.pink.opacity(0.3))
                .frame(width: 200, height: 200)
                .offset(x: animateGradient ? -120 : -80, y: animateGradient ? -220 : -180)
                .blur(radius: 50)
                .onAppear {
                    withAnimation(.easeInOut(duration: 5).repeatForever(autoreverses: true)) {
                        animateGradient.toggle()
                    }
                }

        VStack(spacing: 12) {
            Spacer()
            
            // شاشة العرض الزجاجية
            HStack {
                Spacer()
                Text(displayText)
                    .font(.system(size: 80))
                    .fontWeight(.light)
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }
            .padding()
            .background(.ultraThinMaterial)
            .cornerRadius(20)
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.2), lineWidth: 1))
            .padding(.horizontal)
            .padding()

            // أزرار الآلة الحاسبة
            ForEach(buttons, id: \.self) { row in
                HStack(spacing: 12) {
                    ForEach(row, id: \.self) { button in
                        Button(action: {
                            self.didTap(button: button)
                        }) {
                            Text(button.rawValue)
                                .font(.system(size: 32, weight: .medium))
                                .frame(
                                    width: self.buttonWidth(item: button),
                                    height: self.buttonHeight()
                                )
                                .background(
                                    button == .equal ? Color.orange : Color.white.opacity(0.1)
                                )
                                .background(.ultraThinMaterial)
                                .foregroundColor(button.textColor)
                                .cornerRadius(self.buttonHeight() / 2)
                                .overlay(RoundedRectangle(cornerRadius: self.buttonHeight() / 2).stroke(Color.white.opacity(0.1), lineWidth: 1))
                        }
                    }
                }
            }
        }
        .padding(.bottom)
        }
    }

    func didTap(button: CalculatorButton) {
        switch button {
        case .add, .subtract, .multiply, .divide:
            currentOperation = button
            runningNumber = Double(displayText) ?? 0
            isUserTyping = false
        case .equal:
            if let operation = currentOperation {
                let current = Double(displayText) ?? 0
                switch operation {
                case .add: displayText = formatResult(runningNumber + current)
                case .subtract: displayText = formatResult(runningNumber - current)
                case .multiply: displayText = formatResult(runningNumber * current)
                case .divide: displayText = current != 0 ? formatResult(runningNumber / current) : "Error"
                default: break
                }
                currentOperation = nil
                isUserTyping = false
            }
        case .clear:
            displayText = "0"
            runningNumber = 0
            currentOperation = nil
            isUserTyping = false
        case .decimal:
            if !isUserTyping {
                displayText = "0."
                isUserTyping = true
            } else if !displayText.contains(".") {
                displayText += "."
            }
        case .negative:
            if let value = Double(displayText) {
                displayText = formatResult(value * -1)
            }
        case .percent:
            if let value = Double(displayText) {
                displayText = formatResult(value / 100)
            }
        default:
            let number = button.rawValue
            if isUserTyping {
                displayText += number
            } else {
                displayText = number
                isUserTyping = true
            }
        }
    }

    func formatResult(_ value: Double) -> String {
        return value.truncatingRemainder(dividingBy: 1) == 0 ? String(format: "%.0f", value) : String(value)
    }

    func buttonWidth(item: CalculatorButton) -> CGFloat {
        if item == .zero {
            return (UIScreen.main.bounds.width - (4 * 12)) / 4 * 2 + 12
        }
        return (UIScreen.main.bounds.width - (5 * 12)) / 4
    }

    func buttonHeight() -> CGFloat {
        return (UIScreen.main.bounds.width - (5 * 12)) / 4
    }
}
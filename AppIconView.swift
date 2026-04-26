import SwiftUI

struct AppIconView: View {
    var body: some View {
        ZStack {
            // نفس الخلفية السائلة الخاصة بالتطبيق
            LinearGradient(gradient: Gradient(colors: [Color.purple, Color.blue, Color.black]), 
                           startPoint: .topLeading, 
                           endPoint: .bottomTrailing)
            
            // تأثير الزجاج في الأيقونة
            RoundedRectangle(cornerRadius: 200)
                .fill(Color.white.opacity(0.15))
                .frame(width: 700, height: 700)
                .blur(radius: 20)
                .overlay(
                    RoundedRectangle(cornerRadius: 200)
                        .stroke(Color.white.opacity(0.2), lineWidth: 10)
                )
            
            // رمز الآلة الحاسبة
            Image(systemName: "divide")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 400, height: 400)
                .foregroundColor(.white)
                .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
        }
        .frame(width: 1024, height: 1024)
        .clipShape(Rectangle()) // الأيقونات في iOS يتم قص زواياها بواسطة النظام
    }
}

#Preview {
    AppIconView()
        .previewLayout(.sizeThatFits)
}
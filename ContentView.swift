import SwiftUI

struct PrayerTime: Identifiable {
    let id = UUID()
    let name: String
    let time: String
    let icon: String
}

struct ContentView: View {
    @State private var prayerTimes = [
        PrayerTime(name: "الفجر", time: "04:32 AM", icon: "sunrise.fill"),
        PrayerTime(name: "الظهر", time: "12:05 PM", icon: "sun.max.fill"),
        PrayerTime(name: "العصر", time: "03:40 PM", icon: "sun.horizon.fill"),
        PrayerTime(name: "المغرب", time: "06:15 PM", icon: "sunset.fill"),
        PrayerTime(name: "العشاء", time: "07:45 PM", icon: "moon.stars.fill")
    ]
    @State private var animateGradient = false

    var body: some View {
        ZStack {
            // خلفية سائلة محسنة
            LinearGradient(gradient: Gradient(colors: [Color.indigo, Color.black]), 
                           startPoint: .topLeading, 
                           endPoint: .bottomTrailing)
                .ignoresSafeArea()
            
            Circle()
                .fill(Color.blue.opacity(0.4))
                .frame(width: 300, height: 300)
                .offset(x: animateGradient ? -100 : 100, y: animateGradient ? -150 : 150)
                .blur(radius: 50)
            
            Circle()
                .fill(Color.purple.opacity(0.3))
                .frame(width: 250, height: 250)
                .offset(x: animateGradient ? 100 : -100, y: animateGradient ? 200 : -200)
                .blur(radius: 60)

            VStack(spacing: 25) {
                // العنوان
                VStack(spacing: 8) {
                    Text("مواقيت الصلاة")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("القاهرة، مصر")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.top, 40)

                // عرض الوقت الحالي (زجاجي)
                VStack {
                    Text("الصلاة القادمة: الظهر")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                    
                    Text("12:05")
                        .font(.system(size: 60, weight: .thin, design: .rounded))
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 30)
                .background(.ultraThinMaterial)
                .cornerRadius(30)
                .overlay(RoundedRectangle(cornerRadius: 30).stroke(Color.white.opacity(0.2), lineWidth: 1))
                .padding(.horizontal)

                // قائمة المواقيت
                VStack(spacing: 15) {
                    ForEach(prayerTimes) { prayer in
                        HStack {
                            Image(systemName: prayer.icon)
                                .foregroundColor(.orange)
                                .font(.title3)
                            
                            Text(prayer.name)
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            Text(prayer.time)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.9))
                        }
                        .padding()
                        .background(Color.white.opacity(0.05))
                        .background(.ultraThinMaterial)
                        .cornerRadius(20)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.1), lineWidth: 1))
                    }
                }
                .padding(.horizontal)
                
                Spacer()
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 7).repeatForever(autoreverses: true)) {
                animateGradient.toggle()
            }
        }
    }
}
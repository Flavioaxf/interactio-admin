import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { getDatabase, ref, set } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import '../../src/firebase';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Componente de Fundo: Rede de Conexões (SVG)
// ─────────────────────────────────────────────
function NetworkBackground() {
  const [particles, setParticles] = useState<any[]>([]);
  const requestRef = useRef<number | null>(null);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const initParticles = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * windowWidth,
      y: Math.random() * windowHeight,
      vx: (Math.random() - 0.5) * 1.0, 
      vy: (Math.random() - 0.5) * 1.0,
      radius: Math.random() * 2 + 1.5,
    }));
    particlesRef.current = initParticles;

    const animate = () => {
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > windowWidth) p.vx *= -1;
        if (p.y < 0 || p.y > windowHeight) p.vy *= -1;
      });
      setParticles([...particlesRef.current]);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  const lines = [];
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 140) {
        const opacity = 1 - dist / 140;
        lines.push(
          <Line
            key={`${i}-${j}`}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke={`rgba(167, 139, 250, ${opacity * 0.4})`}
            strokeWidth={1}
          />
        );
      }
    }
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg height="100%" width="100%">
        {lines}
        {particles.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.radius} fill="#a78bfa" opacity={0.8} />
        ))}
      </Svg>
    </View>
  );
}

// ─────────────────────────────────────────────
// Tela Principal do Painel
// ─────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Lendo o tamanho da tela em tempo real
  const { width } = useWindowDimensions();
  const isMobile = width < 600; // Define que telas menores que 600px são "Mobile"

  const handleCreateSession = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    setIsLoading(true);
    try {
      const sessionCode = Math.floor(1000 + Math.random() * 9000).toString();
      const db = getDatabase();
      const sessionRef = ref(db, `sessions/${sessionCode}`);

      await set(sessionRef, {
        meta: { code: sessionCode, createdAt: Date.now(), status: 'active' }
      });

      router.push(`/session/${sessionCode}/create-card`);
    } catch (error) {
      alert("Ops! Falha ao criar a sessão. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#111827', '#0f0e17', '#1e1b4b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <NetworkBackground />

      <View style={[styles.contentWrapper, { padding: isMobile ? 16 : 24 }]}>
        
        {/* Cartão Central (Mais fino no celular) */}
        <View style={[styles.glassCard, { padding: isMobile ? 24 : 40 }]}>
          <View style={styles.logoContainer}>
            {/* Fonte menor no celular para não quebrar a linha */}
            <Text style={[styles.title, { fontSize: isMobile ? 44 : 56 }]}>
              inter<Text style={styles.highlight}>actio</Text>
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PAINEL DO APRESENTADOR</Text>
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', marginTop: isMobile ? 10 : 20 }}>
            <TouchableOpacity
              style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]}
              onPress={handleCreateSession}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#0f0e17" />
              ) : (
                <Text style={styles.buttonTextPrimary}>Criar Nova Sessão</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.buttonSecondary}>
            <Text style={styles.buttonTextSecondary}>Acessar histórico de sessões</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Rodapé Inteligente (Empilha no celular, fica lado a lado no PC) */}
      <View style={[
        styles.footer, 
        { 
          flexDirection: isMobile ? 'column' : 'row',
          bottom: isMobile ? 20 : 30,
          gap: isMobile ? 12 : 0
        }
      ]}>
        <Text style={styles.footerText}>Interactio OS • Versão 1.0 (Beta)</Text>
        <TouchableOpacity><Text style={styles.footerLink}>Precisa de ajuda?</Text></TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────
// Estilos Base
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  contentWrapper: { width: '100%', maxWidth: 480, alignItems: 'center', zIndex: 10 },
  
  glassCard: {
    width: '100%',
    backgroundColor: '#1a1924', 
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },

  logoContainer: { alignItems: 'center', marginBottom: 40 },
  title: { fontWeight: '800', color: '#e8e6f0', marginBottom: 12, letterSpacing: -1.5 },
  highlight: { color: '#a78bfa' },
  
  badge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgeText: { fontSize: 12, color: '#a78bfa', fontWeight: '700', letterSpacing: 1.5 },

  buttonPrimary: { 
    backgroundColor: '#a78bfa', 
    paddingVertical: 20, 
    borderRadius: 16, 
    width: '100%', 
    alignItems: 'center',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    ...(Platform.OS === 'web' && {
      transitionProperty: 'all',
      transitionDuration: '0.3s',
      cursor: 'pointer',
      ':hover': { transform: 'translateY(-3px)', shadowOpacity: 0.45 }
    } as any),
  },
  
  buttonDisabled: { opacity: 0.7 },
  buttonTextPrimary: { color: '#0f0e17', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  buttonSecondary: { marginTop: 20, paddingVertical: 12 },
  buttonTextSecondary: { color: '#8b89a0', fontSize: 14, fontWeight: '600' },

  footer: {
    position: 'absolute',
    width: '100%',
    maxWidth: 800,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  footerText: { color: '#5a5872', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  footerLink: { color: '#a78bfa', fontSize: 12, fontWeight: '600', textAlign: 'center' }
});
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  Animated, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
// ── ADICIONAMOS O 'update' AQUI ──
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import '../../../src/firebase'; 

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

function NetworkBackground() {
  const [particles, setParticles] = useState<any[]>([]);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const initParticles = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * windowWidth,
      y: Math.random() * windowHeight,
      vx: (Math.random() - 0.5) * 0.4, 
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
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

      if (dist < 180) {
        const opacity = (1 - dist / 180) * 0.15; 
        lines.push(
          <Line key={`${i}-${j}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={`rgba(167, 139, 250, ${opacity})`} strokeWidth={1} />
        );
      }
    }
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[styles.bgGlow, { top: -200, left: -200, backgroundColor: 'rgba(167, 139, 250, 0.1)' }]} />
      <View style={[styles.bgGlow, { bottom: -200, right: -200, backgroundColor: 'rgba(56, 189, 248, 0.05)' }]} />
      
      <Svg height="100%" width="100%">
        {lines}
        {particles.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.radius} fill="#a78bfa" opacity={0.2} />
        ))}
      </Svg>
    </View>
  );
}

export default function LiveControlScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [votes, setVotes] = useState<{ [key: string]: number }>({});
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    if (!id) return;
    const db = getDatabase();
    const sessionId = typeof id === 'string' ? id : id[0];
    const sessionRef = ref(db, `sessions/${sessionId}`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSessionData(data);
        
        // Agora pegamos o índice atual de forma segura
        const currentIndex = typeof data.currentInteraction === 'number' ? data.currentInteraction : 0;
        
        // Pega as respostas APENAS do slide atual
        const responses = data.responses ? data.responses[currentIndex] : {};
        const counts: { [key: string]: number } = {};
        let total = 0;
        
        if (responses) {
          Object.values(responses).forEach((val: any) => { 
            counts[val] = (counts[val] || 0) + 1; 
            total++; 
          });
        }
        
        setVotes(counts);
        setTotalVotes(total);
      } else {
        setErrorMessage("Sessão não encontrada no banco de dados.");
      }
      setLoading(false);
    }, (error) => {
      setErrorMessage(`Erro de conexão: ${error.message}`);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // ── LÓGICA DO CONTROLE REMOTO ──
  const changeSlide = async (direction: 'next' | 'prev') => {
    if (!sessionData || !sessionData.interactions) return;
    
    const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
    const totalSlides = sessionData.interactions.length;
    
    let newIndex = currentIndex;
    
    if (direction === 'next' && currentIndex < totalSlides - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else {
      return; // Não faz nada se já estiver no limite
    }

    const db = getDatabase();
    const sessionId = typeof id === 'string' ? id : id[0];
    
    // Atualiza o Firebase. Como os alunos estão "ouvindo", a tela deles muda na hora!
    await update(ref(db, `sessions/${sessionId}`), {
      currentInteraction: newIndex
    });
  };

  if (loading || errorMessage) return <LoadingOrError loading={loading} errorMessage={errorMessage} router={router} />;

  // Descobre qual é o slide atual e quantos slides existem no total
  const currentIndex = typeof sessionData?.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
  const currentInteraction = sessionData?.interactions?.[currentIndex];
  const totalSlides = sessionData?.interactions?.length || 1;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <NetworkBackground />

      <View style={styles.topBar}>
        <View style={styles.topLeftGroup}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#e8e6f0" />
          </TouchableOpacity>
          <Text style={styles.logoText}>inter<Text style={styles.highlightText}>actio</Text></Text>
        </View>
        
        <View style={styles.pinCard}>
          <Text style={styles.joinLabel}>Acesse <Text style={styles.whiteText}>interactio.app</Text> e use o código:</Text>
          <View style={styles.pinBadge}>
            <Text style={styles.pinText}>{id}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIconBox}>
            <Ionicons name="people" size={24} color="#a78bfa" />
          </View>
          <View>
            <Text style={styles.statsLabel}>PARTICIPANTES</Text>
            <Text style={styles.statsText}>{totalVotes}</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContainer}>
        <View style={styles.contentLeft}>
          <Text style={styles.questionTitle}>
            {currentInteraction?.question || "Aguardando próxima pergunta..."}
          </Text>
          
          <View style={styles.chartContainer}>
            {currentInteraction?.type === 'multiple_choice' && currentInteraction?.options?.map((option: string, index: number) => {
              const count = votes[index] || 0;
              const percentage = totalVotes > 0 ? (count / totalVotes) : 0;
              
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barLabelGroup}>
                    <Text style={styles.barOptionText}>{option}</Text>
                    <Text style={styles.barCountText}>{count} <Text style={styles.barPercentText}>({(percentage * 100).toFixed(0)}%)</Text></Text>
                  </View>
                  <View style={styles.barTrack}>
                    <AnimatedBar percentage={percentage} />
                  </View>
                </View>
              );
            })}
            
            {/* Aviso se for um slide diferente de múltipla escolha (temporário) */}
            {currentInteraction?.type !== 'multiple_choice' && (
              <View style={styles.comingSoonBox}>
                <Ionicons name="construct-outline" size={48} color="#8b89a0" />
                <Text style={styles.comingSoonText}>Modo {currentInteraction?.type} em desenvolvimento...</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.qrSide}>
          <View style={styles.qrGlassCard}>
            <View style={styles.qrInnerBorder}>
              <Ionicons name="qr-code" size={160} color="#e8e6f0" />
            </View>
            <Text style={styles.qrDesc}>Aponte a câmera para votar</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Interactio OS • Transmissão ao Vivo</Text>
      </View>

      {/* ── BARRA FLUTUANTE DE CONTROLE DE SLIDES ── */}
      {totalSlides > 1 && (
        <View style={styles.slideControls}>
          <TouchableOpacity 
            style={[styles.controlButton, currentIndex === 0 && styles.controlButtonDisabled]} 
            onPress={() => changeSlide('prev')}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={28} color={currentIndex === 0 ? '#5a5872' : '#e8e6f0'} />
          </TouchableOpacity>
          
          <View style={styles.slideIndicator}>
            <Text style={styles.slideIndicatorText}>Slide {currentIndex + 1} de {totalSlides}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.controlButton, currentIndex === totalSlides - 1 && styles.controlButtonDisabled]} 
            onPress={() => changeSlide('next')}
            disabled={currentIndex === totalSlides - 1}
          >
            <Ionicons name="chevron-forward" size={28} color={currentIndex === totalSlides - 1 ? '#5a5872' : '#e8e6f0'} />
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

function AnimatedBar({ percentage }: { percentage: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: percentage * 100,
      useNativeDriver: false,
      friction: 7,
      tension: 40
    }).start();
  }, [percentage]);

  return (
    <Animated.View 
      style={[
        styles.barFill, 
        { 
          width: widthAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%']
          }) 
        }
      ]} 
    />
  );
}

function LoadingOrError({ loading, errorMessage, router }: { loading: boolean, errorMessage: string, router: any }) {
  return (
    <View style={styles.loadingRoot}>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableOpacity style={styles.backButtonAbsolute} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#e8e6f0" />
      </TouchableOpacity>
      {loading ? (
        <>
          <ActivityIndicator size="large" color="#a78bfa" />
          <Text style={styles.loadingText}>Preparando o palco...</Text>
        </>
      ) : (
        <>
          <Ionicons name="warning-outline" size={64} color="#ef4444" />
          <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 16 }]}>{errorMessage}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0e17' },
  bgGlow: { position: 'absolute', width: 600, height: 600, borderRadius: 300, filter: 'blur(100px)' as any }, 
  loadingRoot: { flex: 1, backgroundColor: '#0f0e17', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8b89a0', marginTop: 24, fontSize: 20, fontWeight: '600' },
  backButtonAbsolute: { position: 'absolute', top: 40, left: 40, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  topBar: { height: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(15, 14, 23, 0.6)', backdropFilter: 'blur(10px)' as any },
  topLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 36, fontWeight: '800', color: '#e8e6f0', letterSpacing: -1 },
  highlightText: { color: '#a78bfa' },
  pinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, paddingLeft: 24, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  joinLabel: { color: '#8b89a0', fontSize: 18, marginRight: 16 },
  whiteText: { color: '#fff', fontWeight: '700' },
  pinBadge: { backgroundColor: '#a78bfa', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 100, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  pinText: { color: '#0f0e17', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  statsCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, paddingRight: 24, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statsIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(167, 139, 250, 0.15)', justifyContent: 'center', alignItems: 'center' },
  statsLabel: { color: '#8b89a0', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statsText: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', lineHeight: 28 },

  mainContainer: { flex: 1, flexDirection: 'row', paddingHorizontal: 60, paddingTop: 60, gap: 100, zIndex: 10 },
  contentLeft: { flex: 1.5, justifyContent: 'center', paddingBottom: 60 },
  questionTitle: { color: '#e8e6f0', fontSize: 56, fontWeight: '900', marginBottom: 60, lineHeight: 64, letterSpacing: -1 },
  chartContainer: { gap: 40 },
  barWrapper: { width: '100%' },
  barLabelGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-end' },
  barOptionText: { color: '#e8e6f0', fontSize: 24, fontWeight: '700' },
  barCountText: { color: '#a78bfa', fontSize: 28, fontWeight: '900' },
  barPercentText: { color: '#8b89a0', fontSize: 18, fontWeight: '600' },
  barTrack: { height: 32, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  barFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 16, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15 },
  
  comingSoonBox: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  comingSoonText: { color: '#8b89a0', fontSize: 20, fontWeight: '600', marginTop: 16 },

  qrSide: { flex: 0.8, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  qrGlassCard: { backgroundColor: 'rgba(26, 25, 36, 0.6)', padding: 32, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 30 }, shadowOpacity: 0.5, shadowRadius: 40, backdropFilter: 'blur(20px)' as any },
  qrInnerBorder: { padding: 24, backgroundColor: '#0f0e17', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24 },
  qrDesc: { color: '#8b89a0', fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },

  footer: { height: 60, justifyContent: 'center', alignItems: 'center' },
  footerBrand: { color: '#5a5872', fontSize: 14, fontWeight: '600', letterSpacing: 1 },

  // ── ESTILOS DA BARRA DE CONTROLE FLUTUANTE ──
  slideControls: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 25, 36, 0.8)',
    borderRadius: 100,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    backdropFilter: 'blur(15px)' as any,
    zIndex: 100,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  slideIndicator: {
    paddingHorizontal: 24,
  },
  slideIndicatorText: {
    color: '#e8e6f0',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  }
});
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  Animated, 
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Modal
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
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
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!id) return;
    const db = getDatabase();
    const sessionId = typeof id === 'string' ? id : id[0];
    const sessionRef = ref(db, `sessions/${sessionId}`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSessionData(data);
        const currentIndex = typeof data.currentInteraction === 'number' ? data.currentInteraction : 0;
        const currentInteraction = data.interactions?.[currentIndex];
        const isWordCloud = currentInteraction?.type === 'word_cloud';
        
        const responses = data.responses ? data.responses[currentIndex] : {};
        const counts: { [key: string]: number } = {};
        let participantsCount = 0;
        
        if (responses) {
          Object.values(responses).forEach((val: any) => { 
            participantsCount++;
            if (isWordCloud && Array.isArray(val)) {
              val.forEach(word => {
                counts[word] = (counts[word] || 0) + 1;
              });
            } else if (!isWordCloud) {
              counts[val] = (counts[val] || 0) + 1; 
            }
          });
        }
        
        setVotes(counts);
        setTotalParticipants(participantsCount);
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

  const changeSlide = async (direction: 'next' | 'prev') => {
    if (!sessionData || !sessionData.interactions) return;
    const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
    const totalSlides = sessionData.interactions.length;
    let newIndex = currentIndex;
    
    if (direction === 'next' && currentIndex < totalSlides - 1) newIndex = currentIndex + 1;
    else if (direction === 'prev' && currentIndex > 0) newIndex = currentIndex - 1;
    else return;

    const db = getDatabase();
    const sessionId = typeof id === 'string' ? id : id[0];
    await update(ref(db, `sessions/${sessionId}`), { currentInteraction: newIndex });
  };

  if (loading || errorMessage) return <LoadingOrError loading={loading} errorMessage={errorMessage} router={router} />;

  const currentIndex = typeof sessionData?.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
  const currentInteraction = sessionData?.interactions?.[currentIndex];
  const totalSlides = sessionData?.interactions?.length || 1;

  const wordCloudArray = Object.entries(votes)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);

  const maxWordCount = wordCloudArray.length > 0 ? wordCloudArray[0].count : 1;
  
  const interleavedCloud: typeof wordCloudArray = [];
  let left = 0;
  let right = wordCloudArray.length - 1;
  while(left <= right) {
      if(left === right) { interleavedCloud.push(wordCloudArray[left]); break; }
      interleavedCloud.push(wordCloudArray[left]);
      interleavedCloud.push(wordCloudArray[right]);
      left++;
      right--;
  }

  const cloudColors = ['#f472b6', '#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#e8e6f0'];

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
          <TouchableOpacity 
            style={styles.qrTriggerButton} 
            onPress={() => setShowQR(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={20} color="#0f0e17" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIconBox}>
            <Ionicons name="people" size={24} color="#a78bfa" />
          </View>
          <View>
            <Text style={styles.statsLabel}>PARTICIPANTES</Text>
            <Text style={styles.statsText}>{totalParticipants}</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContainer}>
        <Text style={styles.questionTitle}>
          {currentInteraction?.question || "Aguardando próxima pergunta..."}
        </Text>
        
        <View style={styles.interactionWrapper}>
          {currentInteraction?.type === 'multiple_choice' && (
            <View style={styles.barsContainer}>
              {currentInteraction?.options?.map((option: string, index: number) => {
                const count = votes[index] || 0;
                const percentage = totalParticipants > 0 ? (count / totalParticipants) : 0;
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
            </View>
          )}

          {currentInteraction?.type === 'word_cloud' && (
            <View style={styles.cloudWrapper}>
              {interleavedCloud.length === 0 ? (
                <View style={styles.waitingCloud}>
                  <Ionicons name="cloud-outline" size={80} color="rgba(244, 114, 182, 0.2)" />
                  <Text style={styles.waitingCloudText}>Aguardando as primeiras palavras...</Text>
                </View>
              ) : (
                <View style={styles.cloudFlexContainer}>
                  {interleavedCloud.map((wordObj, index) => {
                    const minFont = 24;
                    const maxFont = 130; 
                    const fontSize = maxWordCount === 1 
                      ? 50 
                      : minFont + ((wordObj.count - 1) / (maxWordCount - 1)) * (maxFont - minFont);
                    
                    const color = cloudColors[index % cloudColors.length];
                    const isVertical = (index % 4 === 0) && fontSize < 60;

                    return (
                      <Text 
                        key={wordObj.text} 
                        style={[
                          styles.cloudWord, 
                          { 
                            fontSize, 
                            color,
                            transform: [{ rotate: isVertical ? '-90deg' : '0deg' }],
                            marginHorizontal: isVertical ? -10 : 12,
                            marginVertical: isVertical ? 20 : 4,
                            textShadowColor: wordObj.count === maxWordCount ? color : 'transparent',
                          }
                        ]}
                      >
                        {wordObj.text.toLowerCase()}
                      </Text>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          
          {currentInteraction?.type === 'q_and_a' && (
            <View style={styles.comingSoonBox}>
              <Ionicons name="construct-outline" size={48} color="#8b89a0" />
              <Text style={styles.comingSoonText}>Modo Q&A em desenvolvimento...</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Interactio OS • Transmissão ao Vivo</Text>
      </View>

      {totalSlides > 1 && (
        <View style={styles.slideControls}>
          <TouchableOpacity style={[styles.controlButton, currentIndex === 0 && styles.controlButtonDisabled]} onPress={() => changeSlide('prev')} disabled={currentIndex === 0}>
            <Ionicons name="chevron-back" size={28} color={currentIndex === 0 ? '#5a5872' : '#e8e6f0'} />
          </TouchableOpacity>
          <View style={styles.slideIndicator}><Text style={styles.slideIndicatorText}>Slide {currentIndex + 1} de {totalSlides}</Text></View>
          <TouchableOpacity style={[styles.controlButton, currentIndex === totalSlides - 1 && styles.controlButtonDisabled]} onPress={() => changeSlide('next')} disabled={currentIndex === totalSlides - 1}>
            <Ionicons name="chevron-forward" size={28} color={currentIndex === totalSlides - 1 ? '#5a5872' : '#e8e6f0'} />
          </TouchableOpacity>
        </View>
      )}

      {showQR && (
        <TouchableOpacity 
          style={styles.qrOverlay} 
          activeOpacity={1} 
          onPress={() => setShowQR(false)}
        >
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalInnerBorder}>
              <Ionicons name="qr-code" size={320} color="#e8e6f0" />
            </View>
            <Text style={styles.qrModalDesc}>Aponte a câmera do seu celular</Text>
            <Text style={styles.qrModalHint}>Toque em qualquer lugar para fechar</Text>
          </View>
        </TouchableOpacity>
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
        { width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }
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
        <><ActivityIndicator size="large" color="#a78bfa" /><Text style={styles.loadingText}>Preparando o palco...</Text></>
      ) : (
        <><Ionicons name="warning-outline" size={64} color="#ef4444" /><Text style={[styles.loadingText, { color: '#ef4444', marginTop: 16 }]}>{errorMessage}</Text></>
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
  topBar: { height: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(15, 14, 23, 0.6)', backdropFilter: 'blur(10px)' as any, zIndex: 50 },
  topLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 36, fontWeight: '800', color: '#e8e6f0', letterSpacing: -1 },
  highlightText: { color: '#a78bfa' },
  pinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, paddingLeft: 24, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  joinLabel: { color: '#8b89a0', fontSize: 18, marginRight: 16 },
  whiteText: { color: '#fff', fontWeight: '700' },
  pinBadge: { backgroundColor: '#a78bfa', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 100, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  pinText: { color: '#0f0e17', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  qrTriggerButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8e6f0', justifyContent: 'center', alignItems: 'center', marginLeft: 12, shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10 },
  statsCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, paddingRight: 24, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statsIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(167, 139, 250, 0.15)', justifyContent: 'center', alignItems: 'center' },
  statsLabel: { color: '#8b89a0', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statsText: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', lineHeight: 28 },
  mainContainer: { flex: 1, paddingHorizontal: 80, paddingTop: 60, paddingBottom: 120, zIndex: 10 },
  questionTitle: { color: '#e8e6f0', fontSize: 56, fontWeight: '900', marginBottom: 20, lineHeight: 64, letterSpacing: -1, textAlign: 'center' },
  interactionWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  barsContainer: { width: '100%', maxWidth: 1000, gap: 40 },
  barWrapper: { width: '100%' },
  barLabelGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-end' },
  barOptionText: { color: '#e8e6f0', fontSize: 24, fontWeight: '700' },
  barCountText: { color: '#a78bfa', fontSize: 28, fontWeight: '900' },
  barPercentText: { color: '#8b89a0', fontSize: 18, fontWeight: '600' },
  barTrack: { height: 32, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  barFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 16, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15 },
  cloudWrapper: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  waitingCloud: { alignItems: 'center', padding: 60, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  waitingCloudText: { color: '#8b89a0', fontSize: 24, fontWeight: '600', marginTop: 24 },
  cloudFlexContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignContent: 'center', maxWidth: 1400 },
  cloudWord: { fontWeight: '900', letterSpacing: -2, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30 },
  comingSoonBox: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  comingSoonText: { color: '#8b89a0', fontSize: 20, fontWeight: '600', marginTop: 16 },
  footer: { height: 60, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 0, width: '100%' },
  footerBrand: { color: '#5a5872', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  slideControls: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 25, 36, 0.8)', borderRadius: 100, padding: 8, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, backdropFilter: 'blur(15px)' as any, zIndex: 100 },
  controlButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  controlButtonDisabled: { backgroundColor: 'transparent', opacity: 0.5 },
  slideIndicator: { paddingHorizontal: 24 },
  slideIndicatorText: { color: '#e8e6f0', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  qrOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 14, 23, 0.90)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, ...(Platform.OS === 'web' && { backdropFilter: 'blur(20px)' } as any) },
  qrModalCard: { backgroundColor: 'rgba(26, 25, 36, 0.8)', padding: 48, borderRadius: 48, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)', alignItems: 'center', shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 50 },
  qrModalInnerBorder: { padding: 32, backgroundColor: '#0f0e17', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 32 },
  qrModalDesc: { color: '#e8e6f0', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  qrModalHint: { color: '#8b89a0', fontSize: 16, fontWeight: '600' }
});
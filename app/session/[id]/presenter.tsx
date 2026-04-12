import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { getDatabase, onValue, ref } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    View
} from 'react-native';
import '../../../src/firebase';

const { width } = Dimensions.get('window');

export default function PresenterScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [votes, setVotes] = useState<{ [key: string]: number }>({});
  const [totalVotes, setTotalVotes] = useState(0);

  // ── LÓGICA DE SINCRONIZAÇÃO EM TEMPO REAL ──
  useEffect(() => {
    const db = getDatabase();
    const sessionRef = ref(db, `sessions/${id}`);

    // Escuta mudanças na sessão (pergunta ativa, status, etc)
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSessionData(data);
        
        // Se houver uma interação ativa, vamos contar os votos
        const currentId = data.currentInteraction;
        const responses = data.responses ? data.responses[currentId] : {};
        
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
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={styles.loadingText}>A carregar apresentação...</Text>
      </View>
    );
  }

  const currentInteraction = sessionData?.interactions?.[sessionData?.currentInteraction];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── CABEÇALHO (PIN E INSTRUÇÕES) ── */}
      <View style={styles.topBar}>
        <View style={styles.logoGroup}>
           <Text style={styles.logoText}>inter<Text style={styles.highlightText}>actio</Text></Text>
        </View>
        
        <View style={styles.joinInstructions}>
          <Text style={styles.joinLabel}>Acede a <Text style={styles.whiteText}>interactio.app</Text> e introduz o código:</Text>
          <View style={styles.pinBadge}>
            <Text style={styles.pinText}>{id}</Text>
          </View>
        </View>

        <View style={styles.statsGroup}>
          <Ionicons name="people" size={24} color="#a78bfa" />
          <Text style={styles.statsText}>{totalVotes}</Text>
        </View>
      </View>

      {/* ── ÁREA CENTRAL (PERGUNTA E GRÁFICO) ── */}
      <View style={styles.mainContainer}>
        
        <View style={styles.contentLeft}>
          <Text style={styles.questionTitle}>
            {currentInteraction?.question || "A aguardar pergunta..."}
          </Text>
          
          <View style={styles.chartContainer}>
            {currentInteraction?.options?.map((option: string, index: number) => {
              const count = votes[index] || 0;
              const percentage = totalVotes > 0 ? (count / totalVotes) : 0;
              
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barLabelGroup}>
                    <Text style={styles.barOptionText}>{option}</Text>
                    <Text style={styles.barCountText}>{count}</Text>
                  </View>
                  
                  <View style={styles.barTrack}>
                    <AnimatedBar percentage={percentage} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── QR CODE (LADO DIREITO) ── */}
        <View style={styles.qrSide}>
          <View style={styles.qrPlaceholder}>
            {/* Aqui podes inserir um componente de QR Code real depois */}
            <Ionicons name="qr-code" size={140} color="#e8e6f0" />
          </View>
          <Text style={styles.qrDesc}>Aponta a câmara para entrar</Text>
        </View>

      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Interactio OS • Apresentação em Direto</Text>
      </View>
    </View>
  );
}

// Componente para a barra animada
function AnimatedBar({ percentage }: { percentage: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: percentage * 100,
      useNativeDriver: false,
      friction: 8,
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0e17', paddingHorizontal: 60 },
  loadingRoot: { flex: 1, backgroundColor: '#0f0e17', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8b89a0', marginTop: 20, fontSize: 18, fontWeight: '500' },

  // Top Bar
  topBar: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logoGroup: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 32, fontWeight: '800', color: '#e8e6f0', letterSpacing: -1 },
  highlightText: { color: '#a78bfa' },
  
  joinInstructions: { alignItems: 'center' },
  joinLabel: { color: '#8b89a0', fontSize: 16, marginBottom: 8 },
  whiteText: { color: '#fff', fontWeight: '700' },
  pinBadge: { backgroundColor: '#a78bfa', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 16 },
  pinText: { color: '#0f0e17', fontSize: 36, fontWeight: '900', letterSpacing: 2 },

  statsGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsText: { color: '#e8e6f0', fontSize: 24, fontWeight: '800' },

  // Main Content
  mainContainer: { flex: 1, flexDirection: 'row', paddingTop: 60, gap: 100 },
  contentLeft: { flex: 1.5 },
  questionTitle: { color: '#e8e6f0', fontSize: 42, fontWeight: '800', marginBottom: 60, lineHeight: 52 },

  chartContainer: { gap: 32 },
  barWrapper: { width: '100%' },
  barLabelGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  barOptionText: { color: '#e8e6f0', fontSize: 20, fontWeight: '600' },
  barCountText: { color: '#a78bfa', fontSize: 20, fontWeight: '800' },
  barTrack: { height: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 12 },

  // QR Side
  qrSide: { flex: 0.5, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20 },
  qrPlaceholder: { 
    width: 240, 
    height: 240, 
    backgroundColor: '#1a1924', 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    marginBottom: 24
  },
  qrDesc: { color: '#8b89a0', fontSize: 16, fontWeight: '500' },

  footer: { height: 80, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  footerBrand: { color: '#5a5872', fontSize: 14, fontWeight: '600' }
});
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listenActiveCard, listenResponses, listenSession } from '../../../src/firebase';
import type { Response, Session } from '../../../src/types';

export default function LiveControlScreen() {
  const { id: sessionId, activeCardId } = useLocalSearchParams<{ id: string; activeCardId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [currentActiveId, setCurrentActiveId] = useState<string | null>(activeCardId || null);

  // 1. Escuta os dados gerais da sessão
  useEffect(() => {
    if (!sessionId) return;
    const unsub = listenSession(sessionId, (data) => setSession(data));
    return () => unsub();
  }, [sessionId]);

  // 2. Escuta qual é a pergunta (card) ativa no momento
  useEffect(() => {
    if (!sessionId) return;
    const unsub = listenActiveCard(sessionId, (cardId) => setCurrentActiveId(cardId));
    return () => unsub();
  }, [sessionId]);

  // 3. Escuta a contagem de respostas em tempo real
  useEffect(() => {
    if (!sessionId || !currentActiveId) return;
    const unsub = listenResponses(sessionId, currentActiveId, (data) => setResponses(data));
    return () => unsub();
  }, [sessionId, currentActiveId]);

  if (!session) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  const activeCard = currentActiveId ? session.cards?.[currentActiveId] : null;
  const totalResponses = Object.keys(responses).length;

  // Função para calcular os votos e porcentagem de cada opção
  const getOptionStats = (optionId: string) => {
    const count = Object.values(responses).filter((r) => r.value === optionId).length;
    const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
    return { count, percentage };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.sessionCode}>Sessão: {session.meta?.code || sessionId}</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Ao Vivo</Text>
        </View>
      </View>

      {/* Card da Pergunta Atual */}
      {activeCard ? (
        <View style={styles.card}>
          <Text style={styles.questionLabel}>PERGUNTA ATUAL</Text>
          <Text style={styles.question}>{activeCard.question}</Text>
          <Text style={styles.responsesCount}>
            {totalResponses} {totalResponses === 1 ? 'resposta recebida' : 'respostas recebidas'}
          </Text>

          {/* Mini-Dashboard de Resultados */}
          {activeCard.options && (
            <View style={styles.resultsContainer}>
              {Object.entries(activeCard.options).map(([key, option], index) => {
                const stats = getOptionStats(key);
                const letter = String.fromCharCode(65 + index); // A, B, C...

                return (
                  <View key={key} style={styles.optionRow}>
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionName}>{letter} - {option.text}</Text>
                      <Text style={styles.optionStats}>
                        {stats.count} ({stats.percentage}%)
                      </Text>
                    </View>
                    {/* Barra de Progresso */}
                    <View style={styles.progressBarBg}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { width: `${stats.percentage}%` }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.noCardText}>Nenhuma pergunta ativa no momento.</Text>
      )}

      {/* Botão de Voltar / Criar Nova */}
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
        <Text style={styles.btnSecondaryText}>+ Criar Nova Pergunta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Estilos Atualizados
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0e17' },
  content: { padding: 20, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sessionCode: { color: '#a78bfa', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52,211,153,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399', marginRight: 6 },
  liveText: { color: '#34d399', fontWeight: 'bold', fontSize: 12 },
  
  card: { backgroundColor: '#1a1927', padding: 24, borderRadius: 20, borderColor: 'rgba(255,255,255,0.07)', borderWidth: 1, marginBottom: 30, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  questionLabel: { color: '#5a5872', fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  question: { color: '#e8e6f0', fontSize: 24, fontWeight: 'bold', marginBottom: 16, lineHeight: 32 },
  responsesCount: { color: '#34d399', fontSize: 16, fontWeight: 'bold' },
  
  resultsContainer: { marginTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 24 },
  optionRow: { marginBottom: 18 },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  optionName: { color: '#e8e6f0', fontSize: 15, fontWeight: '600', flex: 1, paddingRight: 10 },
  optionStats: { color: '#a78bfa', fontSize: 14, fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 4 },
  
  noCardText: { color: '#8b89a0', textAlign: 'center', marginVertical: 40, fontSize: 16 },
  btnSecondary: { borderWidth: 1, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.05)', borderRadius: 16, padding: 18, alignItems: 'center', borderStyle: 'dashed' },
  btnSecondaryText: { color: '#a78bfa', fontSize: 16, fontWeight: 'bold' }
});
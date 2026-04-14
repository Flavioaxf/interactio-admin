import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { getDatabase, ref, get } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import '../../../src/firebase'; 

const { width: windowWidth } = Dimensions.get('window');

export default function ReportScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter(); 
  const isMobile = windowWidth < 768;
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [totalUniqueParticipants, setTotalUniqueParticipants] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchReportData = async () => {
      try {
        const db = getDatabase();
        const sessionId = typeof id === 'string' ? id : id[0];
        const sessionRef = ref(db, `sessions/${sessionId}`);
        
        // Usamos 'get' em vez de 'onValue' porque os dados estão encerrados e não vão mudar
        const snapshot = await get(sessionRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setSessionData(data);
          
          // Calcula o total de participantes ÚNICOS em toda a sessão
          const uniqueParticipants = new Set<string>();
          if (data.responses) {
            Object.values(data.responses).forEach((slideResponses: any) => {
              if (slideResponses) {
                Object.keys(slideResponses).forEach(participantId => {
                  uniqueParticipants.add(participantId);
                });
              }
            });
          }
          setTotalUniqueParticipants(uniqueParticipants.size);
        } else {
          setErrorMessage("Sessão não encontrada ou dados indisponíveis.");
        }
      } catch (error: any) {
        setErrorMessage(`Erro ao carregar relatório: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [id]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleString('pt-PT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // ── PROCESSADORES DE DADOS POR TIPO ──

  const renderMultipleChoiceResult = (interaction: any, responses: any) => {
    if (!interaction.options || !Array.isArray(interaction.options)) return <Text style={styles.noDataText}>Sem opções definidas.</Text>;
    
    const counts = interaction.options.map(() => 0);
    let totalVotes = 0;

    if (responses) {
      Object.values(responses).forEach((val: any) => {
        if (typeof val === 'number' && counts[val] !== undefined) {
          counts[val]++;
          totalVotes++;
        }
      });
    }

    return (
      <View style={styles.resultsContainer}>
        {interaction.options.map((option: string, idx: number) => {
          const count = counts[idx] || 0;
          const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          
          return (
            <View key={idx} style={styles.barWrapper}>
              <View style={styles.barLabelGroup}>
                <Text style={styles.barOptionText}>{option}</Text>
                <Text style={styles.barCountText}>{count} votos <Text style={styles.barPercentText}>({percentage.toFixed(0)}%)</Text></Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${percentage}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderWordCloudResult = (responses: any) => {
    if (!responses) return <Text style={styles.noDataText}>Nenhuma palavra enviada.</Text>;
    
    const wordCounts: { [key: string]: number } = {};
    Object.values(responses).forEach((val: any) => {
      if (Array.isArray(val)) {
        val.forEach(word => {
          const upperWord = word.toUpperCase();
          wordCounts[upperWord] = (wordCounts[upperWord] || 0) + 1;
        });
      }
    });

    const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);

    if (sortedWords.length === 0) return <Text style={styles.noDataText}>Nenhuma palavra enviada.</Text>;

    return (
      <View style={styles.chipsContainer}>
        {sortedWords.map(([word, count], idx) => (
          <View key={idx} style={styles.chip}>
            <Text style={styles.chipText}>{word}</Text>
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>{count}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderQnAResult = (responses: any) => {
    if (!responses) return <Text style={styles.noDataText}>Nenhuma resposta enviada.</Text>;
    
    const allAnswers: string[] = [];
    Object.values(responses).forEach((val: any) => {
      if (Array.isArray(val)) {
        allAnswers.push(...val);
      }
    });

    if (allAnswers.length === 0) return <Text style={styles.noDataText}>Nenhuma resposta enviada.</Text>;

    return (
      <View style={styles.qnaList}>
        {allAnswers.map((ans, idx) => (
          <View key={idx} style={styles.qnaItem}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#38bdf8" style={{ marginTop: 2 }} />
            <Text style={styles.qnaItemText}>{ans}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading || errorMessage) {
    return (
      <View style={styles.loadingRoot}>
        <Stack.Screen options={{ headerShown: false }} />
        <TouchableOpacity style={styles.backButtonAbsolute} onPress={() => router.replace('/dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#e8e6f0" />
        </TouchableOpacity>
        {loading ? (
          <><ActivityIndicator size="large" color="#fbbf24" /><Text style={styles.loadingText}>A compilar relatório...</Text></>
        ) : (
          <><Ionicons name="warning-outline" size={64} color="#ef4444" /><Text style={[styles.loadingText, { color: '#ef4444', marginTop: 16 }]}>{errorMessage}</Text></>
        )}
      </View>
    );
  }

  const interactions = sessionData?.interactions || [];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/dashboard')} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#e8e6f0" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.iconWrapper}>
              <Ionicons name="bar-chart" size={24} color="#fbbf24" />
            </View>
            <View>
              <Text style={styles.headerSubtitle}>RELATÓRIO DA SESSÃO</Text>
              <Text style={styles.headerTitle}>{id}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── RESUMO GERAL ── */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, isMobile && { width: '100%', marginBottom: 16 }]}>
            <Ionicons name="calendar-outline" size={32} color="#a78bfa" />
            <Text style={styles.summaryValue}>{formatDate(sessionData.finishedAt || sessionData.updatedAt)}</Text>
            <Text style={styles.summaryLabel}>Data de Encerramento</Text>
          </View>
          
          <View style={[styles.summaryCard, isMobile && { width: '100%', marginBottom: 16 }]}>
            <Ionicons name="layers-outline" size={32} color="#38bdf8" />
            <Text style={styles.summaryValue}>{interactions.length}</Text>
            <Text style={styles.summaryLabel}>Total de Slides</Text>
          </View>
          
          <View style={[styles.summaryCard, isMobile && { width: '100%' }]}>
            <Ionicons name="people-outline" size={32} color="#34d399" />
            <Text style={styles.summaryValue}>{totalUniqueParticipants}</Text>
            <Text style={styles.summaryLabel}>Participantes Únicos</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Análise por Interação</Text>

        {/* ── LISTA DE SLIDES ── */}
        {interactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Esta sessão não possui interações registadas.</Text>
          </View>
        ) : (
          <View style={styles.interactionsList}>
            {interactions.map((interaction: any, index: number) => {
              const type = interaction.type || 'multiple_choice';
              const isQnA = type === 'qna' || type === 'q_and_a';
              const slideResponses = sessionData.responses ? sessionData.responses[index] : null;
              
              let typeLabel = "Múltipla Escolha";
              let iconName = "bar-chart-outline";
              let iconColor = "#a78bfa";
              
              if (type === 'word_cloud') {
                typeLabel = "Nuvem de Palavras";
                iconName = "cloud-outline";
                iconColor = "#f472b6";
              } else if (isQnA) {
                typeLabel = "Resposta Livre";
                iconName = "chatbubbles-outline";
                iconColor = "#38bdf8";
              }

              return (
                <View key={index} style={styles.interactionCard}>
                  <View style={styles.interactionHeader}>
                    <View style={styles.interactionTypeBadge}>
                      <Ionicons name={iconName as any} size={16} color={iconColor} />
                      <Text style={[styles.interactionTypeText, { color: iconColor }]}>{typeLabel}</Text>
                    </View>
                    <Text style={styles.slideNumberBadge}>SLIDE {index + 1}</Text>
                  </View>
                  
                  <Text style={styles.interactionQuestion}>{interaction.question || "Sem instrução"}</Text>
                  
                  <View style={styles.interactionBody}>
                    {type === 'multiple_choice' && renderMultipleChoiceResult(interaction, slideResponses)}
                    {type === 'word_cloud' && renderWordCloudResult(slideResponses)}
                    {isQnA && renderQnAResult(slideResponses)}
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0e17' },
  loadingRoot: { flex: 1, backgroundColor: '#0f0e17', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8b89a0', marginTop: 24, fontSize: 20, fontWeight: '600' },
  backButtonAbsolute: { position: 'absolute', top: 40, left: 40, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  
  header: { height: 100, backgroundColor: '#13121d', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', paddingHorizontal: 40 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  iconWrapper: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.15)', justifyContent: 'center', alignItems: 'center' },
  headerSubtitle: { color: '#fbbf24', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  
  scrollContent: { padding: 40, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 24, marginBottom: 48, flexWrap: 'wrap' },
  summaryCard: { flex: 1, minWidth: 250, backgroundColor: '#1a1924', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'flex-start' },
  summaryValue: { color: '#e8e6f0', fontSize: 32, fontWeight: '900', marginTop: 16, marginBottom: 4 },
  summaryLabel: { color: '#8b89a0', fontSize: 15, fontWeight: '600' },
  
  sectionTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', marginBottom: 24, letterSpacing: -0.5 },
  
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#1a1924', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyStateText: { color: '#8b89a0', fontSize: 16 },
  noDataText: { color: '#5a5872', fontSize: 15, fontStyle: 'italic', marginTop: 12 },
  
  interactionsList: { gap: 32 },
  interactionCard: { backgroundColor: '#1a1924', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  interactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  interactionTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  interactionTypeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  slideNumberBadge: { color: '#5a5872', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  interactionQuestion: { color: '#e8e6f0', fontSize: 28, fontWeight: '800', marginBottom: 32, lineHeight: 36 },
  interactionBody: { backgroundColor: '#0f0e17', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  
  // Múltipla Escolha
  resultsContainer: { gap: 20 },
  barWrapper: { gap: 12 },
  barLabelGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barOptionText: { color: '#e8e6f0', fontSize: 16, fontWeight: '700' },
  barCountText: { color: '#e8e6f0', fontSize: 16, fontWeight: '800' },
  barPercentText: { color: '#8b89a0', fontSize: 14, fontWeight: '600' },
  barTrack: { height: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 8 },
  
  // Word Cloud
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244, 114, 182, 0.1)', paddingVertical: 8, paddingLeft: 16, paddingRight: 8, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(244, 114, 182, 0.2)' },
  chipText: { color: '#f472b6', fontSize: 15, fontWeight: '700', marginRight: 12 },
  chipBadge: { backgroundColor: '#f472b6', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  chipBadgeText: { color: '#0f0e17', fontSize: 13, fontWeight: '900' },
  
  // Q&A
  qnaList: { gap: 12 },
  qnaItem: { flexDirection: 'row', gap: 16, backgroundColor: 'rgba(56, 189, 248, 0.05)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.1)' },
  qnaItemText: { color: '#e8e6f0', fontSize: 15, lineHeight: 24, flex: 1 }
});
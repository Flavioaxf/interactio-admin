import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

export default function CreateCardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [activeTab, setActiveTab] = useState('multiple_choice');

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer} 
      style={styles.root}
      showsVerticalScrollIndicator={false}
    >
      {/* ── ADICIONE ESTA LINHA PARA ESCONDER O CABEÇALHO PADRÃO ── */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { padding: isMobile ? 16 : 32 }]}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova Interação</Text>
          <View style={{ width: 80 }} />
        </View>

        <View style={[styles.card, { padding: isMobile ? 24 : 40 }]}>
          
          {/* ── TABS COM ÍCONES VETORIAIS (SEM EMOJIS) ── */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'multiple_choice' && styles.tabActive]}
              onPress={() => setActiveTab('multiple_choice')}
            >
              <Feather 
                name="list" 
                size={16} 
                color={activeTab === 'multiple_choice' ? '#0f0e17' : '#8b89a0'} 
              />
              <Text style={[styles.tabText, activeTab === 'multiple_choice' && styles.tabTextActive]}>
                Múltipla Escolha
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabDisabled} activeOpacity={1}>
              <Feather name="cloud" size={16} color="#8b89a0" />
              <Text style={styles.tabTextDisabled}>Nuvem de Palavras (Em breve)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabDisabled} activeOpacity={1}>
              <Feather name="message-square" size={16} color="#8b89a0" />
              <Text style={styles.tabTextDisabled}>Q&A (Em breve)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>O QUE VOCÊ QUER PERGUNTAR?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ex: Qual foi a principal causa da revolução?"
              placeholderTextColor="#8b89a0"
              multiline
              numberOfLines={4}
              value={question}
              onChangeText={setQuestion}
              maxLength={280}
            />
            <Text style={styles.charCount}>{question.length}/280</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>OPÇÕES DE RESPOSTA</Text>
            
            {options.map((opt, index) => (
              <View key={index} style={styles.optionRow}>
                <View style={styles.optionLetterBox}>
                  <Text style={styles.optionLetterText}>{getOptionLetter(index)}</Text>
                </View>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Opção ${getOptionLetter(index)}`}
                  placeholderTextColor="#8b89a0"
                  value={opt}
                  onChangeText={(text) => {
                    const newOpts = [...options];
                    newOpts[index] = text;
                    setOptions(newOpts);
                  }}
                />
              </View>
            ))}

            {options.length < 6 && (
              <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
                <Text style={styles.addOptionText}>+ Adicionar opção (Máx. 6)</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.startButton} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>⚡ Iniciar Interação Agora</Text>
          </TouchableOpacity>

        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0e17' },
  scrollContainer: { alignItems: 'center', paddingVertical: 40 },
  container: { width: '100%', maxWidth: 900 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  backButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backButtonText: { color: '#e8e6f0', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  card: { backgroundColor: '#1a1924', borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 30, elevation: 10 },

  tabsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
  
  // AQUI: Adicionado flexDirection: 'row', alignItems: 'center' e gap: 8 para o ícone ficar ao lado do texto
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabActive: { backgroundColor: '#a78bfa', borderColor: '#a78bfa' },
  tabDisabled: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100, backgroundColor: 'transparent', opacity: 0.5 },
  
  tabText: { color: '#8b89a0', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#0f0e17', fontWeight: '800' },
  tabTextDisabled: { color: '#8b89a0', fontWeight: '600', fontSize: 14 },

  section: { marginBottom: 32 },
  label: { color: '#5a5872', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  textArea: { backgroundColor: '#0f0e17', color: '#e8e6f0', fontSize: 16, borderRadius: 16, padding: 20, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) },
  charCount: { color: '#5a5872', fontSize: 12, textAlign: 'right', marginTop: 8, fontWeight: '500' },

  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  optionLetterBox: { backgroundColor: 'rgba(167, 139, 250, 0.15)', width: 48, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)' },
  optionLetterText: { color: '#a78bfa', fontWeight: '800', fontSize: 16 },
  optionInput: { flex: 1, backgroundColor: '#0f0e17', color: '#e8e6f0', fontSize: 16, borderRadius: 12, paddingHorizontal: 20, height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) },
  addOptionButton: { borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)', borderStyle: 'dashed', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(167, 139, 250, 0.05)' },
  addOptionText: { color: '#a78bfa', fontWeight: '700', fontSize: 14 },

  startButton: { backgroundColor: '#a78bfa', width: '100%', paddingVertical: 20, borderRadius: 16, alignItems: 'center', marginTop: 16, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15 },
  startButtonText: { color: '#0f0e17', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});
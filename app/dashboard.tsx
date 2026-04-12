import { useRouter, Stack } from 'expo-router';
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: windowWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // ── NOVO ESTADO: CONTROLE DE CARREGAMENTO DAS SESSÕES ──
  const [creationState, setCreationState] = useState<{ active: boolean, mode: 'live' | 'studio' | null }>({
    active: false,
    mode: null
  });

  const generateSessionId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = letters.charAt(Math.floor(Math.random() * letters.length)) + 
                          letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNumbers = Math.floor(1000 + Math.random() * 9000);
    return `${randomLetters}-${randomNumbers}`;
  };

  // ── NOVA LÓGICA COM TRANSIÇÃO ──
  const handleSelectMode = (mode: 'live' | 'studio') => {
    setModalVisible(false);
    setCreationState({ active: true, mode }); // Mostra a tela de carregamento correspondente
    
    // Aguarda 2.5 segundos para o utilizador ler a mensagem de valor do Interactio
    setTimeout(() => {
      const newSessionId = generateSessionId();
      setCreationState({ active: false, mode: null });
      
      if (mode === 'live') {
        router.push(`/session/${newSessionId}/create-card` as any);
      } else {
        router.push(`/session/${newSessionId}/studio` as any);
      }
    }, 2500);
  };

  const handleLogout = () => {
    setIsLoggingOut(true); 
    
    setTimeout(() => {
      router.replace('/' as any); 
    }, 1800); 
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── MENU LATERAL ── */}
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>inter<Text style={styles.highlightText}>actio</Text></Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>APRESENTADOR</Text>
          </View>
        </View>

        <View style={styles.navMenu}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Ionicons name="home" size={20} color="#a78bfa" />
            <Text style={[styles.navText, styles.navTextActive]}>Início</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="layers-outline" size={20} color="#8b89a0" />
            <Text style={styles.navText}>Minhas Sessões</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="settings-outline" size={20} color="#8b89a0" />
            <Text style={styles.navText}>Configurações</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={isLoggingOut || creationState.active}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>

      {/* ── ÁREA PRINCIPAL ── */}
      <View style={styles.mainArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Bem-vindo de volta,</Text>
            <Text style={styles.pageTitle}>Seu Painel</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.newSessionBtn}
            onPress={() => setModalVisible(true)}
            disabled={isLoggingOut || creationState.active}
          >
            <Ionicons name="add" size={20} color="#0f0e17" />
            <Text style={styles.newSessionBtnText}>Nova Sessão</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconBox}>
            <Ionicons name="folder-open-outline" size={32} color="#a78bfa" />
          </View>
          <Text style={styles.emptyStateTitle}>Nenhuma sessão recente</Text>
          <Text style={styles.emptyStateDesc}>
            Crie sua primeira sessão interativa para engajar o seu público em tempo real.
          </Text>
        </View>
      </View>

      {/* ── MODAL DE ESCOLHA DE MODO ── */}
      {isModalVisible && !isLoggingOut && !creationState.active && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Como deseja interagir?</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#8b89a0" />
              </TouchableOpacity>
            </View>
            <View style={styles.modeCardsContainer}>
              <TouchableOpacity style={styles.modeCard} activeOpacity={0.8} onPress={() => handleSelectMode('live')}>
                <View style={[styles.modeIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                  <Ionicons name="flash" size={32} color="#38bdf8" />
                </View>
                <Text style={styles.modeTitle}>Modo Rápido</Text>
                <Text style={styles.modeDesc}>Ideal para momentos dinâmicos. Crie e lance uma interação instantaneamente durante a sua apresentação.</Text>
                <View style={styles.modeAction}>
                  <Text style={[styles.modeActionText, { color: '#38bdf8' }]}>Comece agora →</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeCard} activeOpacity={0.8} onPress={() => handleSelectMode('studio')}>
                <View style={[styles.modeIconBox, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                  <Ionicons name="layers" size={32} color="#a78bfa" />
                </View>
                <Text style={styles.modeTitle}>Modo Estúdio</Text>
                <Text style={styles.modeDesc}>Planejamento completo. Estruture múltiplas interações e organize a sua apresentação com antecedência.</Text>
                <View style={styles.modeAction}>
                  <Text style={[styles.modeActionText, { color: '#a78bfa' }]}>Abrir estúdio →</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── TELA DE TRANSIÇÃO (CRIANDO SESSÃO) ── */}
      {creationState.active && (
        <View style={styles.overlayScreen}>
          <View style={styles.overlayContent}>
            
            <View style={[styles.overlayIconWrapper, { 
              backgroundColor: creationState.mode === 'live' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(167, 139, 250, 0.1)',
              borderColor: creationState.mode === 'live' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(167, 139, 250, 0.2)'
            }]}>
              <Ionicons 
                name={creationState.mode === 'live' ? 'rocket' : 'color-palette'} 
                size={48} 
                color={creationState.mode === 'live' ? '#38bdf8' : '#a78bfa'} 
              />
            </View>
            
            <Text style={styles.overlayTitle}>
              {creationState.mode === 'live' ? 'Preparando velocidade máxima...' : 'Montando o seu estúdio...'}
            </Text>
            
            <Text style={styles.overlayMessageText}>
              {creationState.mode === 'live' 
                ? 'O Interactio traz agilidade instantânea para transformar apresentações estáticas em diálogos dinâmicos.' 
                : 'Crie apresentações de forma livre e artística. Obtenha respostas do seu público em tempo real.'}
            </Text>

            <ActivityIndicator 
              size="large" 
              color={creationState.mode === 'live' ? '#38bdf8' : '#a78bfa'} 
              style={{ marginTop: 32 }}
            />

          </View>
        </View>
      )}

      {/* ── TELA DE DESPEDIDA (LOGOUT FEEDBACK) ── */}
      {isLoggingOut && (
        <View style={styles.overlayScreen}>
          <View style={styles.overlayContent}>
            <View style={styles.overlayIconWrapper}>
              <ActivityIndicator size="large" color="#ef4444" />
            </View>
            <Text style={styles.overlayTitle}>Até breve!</Text>
            <Text style={styles.overlayMessageText}>Encerrando a sua sessão com segurança...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#0f0e17' },
  sidebar: { width: 280, backgroundColor: '#13121d', padding: 24, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)', justifyContent: 'space-between' },
  logoContainer: { marginBottom: 40 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#e8e6f0', letterSpacing: -1 },
  highlightText: { color: '#a78bfa' },
  roleBadge: { backgroundColor: 'rgba(167, 139, 250, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  roleText: { color: '#a78bfa', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  navMenu: { flex: 1, gap: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 },
  navItemActive: { backgroundColor: 'rgba(167, 139, 250, 0.1)' },
  navText: { color: '#8b89a0', fontSize: 15, fontWeight: '600' },
  navTextActive: { color: '#a78bfa', fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, opacity: 0.8 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  
  mainArea: { flex: 1, padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 },
  welcomeText: { color: '#8b89a0', fontSize: 16, marginBottom: 4 },
  pageTitle: { color: '#e8e6f0', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  newSessionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#c4b5fd', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  newSessionBtnText: { color: '#0f0e17', fontSize: 16, fontWeight: '800' },
  emptyStateContainer: { flex: 1, backgroundColor: '#1a1924', borderRadius: 24, justifyContent: 'center', alignItems: 'center', padding: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  emptyStateIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(167, 139, 250, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyStateTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  emptyStateDesc: { color: '#8b89a0', fontSize: 16, textAlign: 'center', maxWidth: 400, lineHeight: 24 },
  
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 14, 23, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, ...(Platform.OS === 'web' && { backdropFilter: 'blur(8px)' } as any) },
  modalContent: { width: '100%', maxWidth: 800, backgroundColor: '#1a1924', borderRadius: 32, padding: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  modalTitle: { color: '#e8e6f0', fontSize: 28, fontWeight: '900' },
  closeModalBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  modeCardsContainer: { flexDirection: Platform.OS === 'web' && windowWidth > 600 ? 'row' : 'column', gap: 24 },
  modeCard: { flex: 1, backgroundColor: '#0f0e17', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modeIconBox: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  modeTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  modeDesc: { color: '#8b89a0', fontSize: 15, lineHeight: 22, marginBottom: 32, flex: 1 },
  modeAction: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  modeActionText: { fontSize: 15, fontWeight: '800' },

  // ── ESTILOS GERAIS PARA AS TELAS DE TRANSIÇÃO/OVERLAY ──
  overlayScreen: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(15, 14, 23, 0.95)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 9999, 
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(15px)' } as any) 
  },
  overlayContent: { 
    alignItems: 'center',
    maxWidth: 500,
    paddingHorizontal: 20
  },
  overlayIconWrapper: { 
    width: 100, height: 100, 
    borderRadius: 50, 
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Default red (para logout)
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 32, 
    borderWidth: 1, 
    borderColor: 'rgba(239, 68, 68, 0.2)' 
  },
  overlayTitle: { 
    color: '#e8e6f0', 
    fontSize: 32, 
    fontWeight: '900', 
    marginBottom: 16, 
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  overlayMessageText: { 
    color: '#8b89a0', 
    fontSize: 16, 
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24
  }
});
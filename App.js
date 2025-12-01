import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// ✅ Nova API do react-native-google-mobile-ads v13+
import {
  BannerAd,
  BannerAdSize,
  TestIds,
  AdEventType,
  useInterstitialAd,
} from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');

// 🔁 IDs DE TESTE (USE ESTES NO DESENVOLVIMENTO!)
// Substitua pelos IDs reais SOMENTE em produção após testar.
const BANNER_ID = TestIds.BANNER; // 'ca-app-pub-3940256099942544/6300978111'
const INTERSTITIAL_ID = TestIds.INTERSTITIAL; // 'ca-app-pub-3940256099942544/1033173712'

// ⚠️ IDs REAIS (comente os de cima e descomente estes APENAS para produção):
// const BANNER_ID = "ca-app-pub-5461017538385057/2198444034";
// const INTERSTITIAL_ID = "ca-app-pub-5461017538385057/3505223638";

const MediaConverter = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [convertedFile, setConvertedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  // ✅ Hook para interstitial (API v13+)
  const {
    isLoaded: interstitialLoaded,
    isLoading: interstitialLoading,
    show: showInterstitial,
    load: loadInterstitial,
  } = useInterstitialAd(INTERSTITIAL_ID, {
    requestOptions: {
      requestNonPersonalizedAdsOnly: false,
    },
  });

  // Solicita permissão de mídia
  useEffect(() => {
    if (permissionResponse?.status !== 'granted') {
      requestPermission();
    }
  }, [permissionResponse, requestPermission]);

  // Carrega o interstitial ao iniciar
  useEffect(() => {
    loadInterstitial();
  }, [loadInterstitial]);

  // Função segura para exibir interstitial
  const handleShowInterstitial = async () => {
    if (interstitialLoading) return;

    try {
      if (interstitialLoaded) {
        await showInterstitial(); // Agora é async!
        loadInterstitial(); // Recarrega para próxima vez
      } else {
        console.warn('Interstitial ainda não carregado — tentando recarregar...');
        loadInterstitial();
      }
    } catch (e) {
      console.error('Erro ao exibir interstitial:', e.message || e);
      Alert.alert('Atenção', 'Não foi possível exibir o anúncio.');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name || 'imagem.jpg',
          mimeType: file.mimeType,
          size: file.size,
          extension: (file.name?.split('.').pop() || 'jpg').toLowerCase(),
        });
        setConvertedFile(null);
        setProgress(0);
      }
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    }
  };

  const convertImage = async (format) => {
    if (!selectedFile) return;

    // ✅ Mostra interstitial ANTES da conversão (assíncrono)
    await handleShowInterstitial();

    setIsConverting(true);
    setProgress(10);

    try {
      const formatMap = {
        'JPEG': SaveFormat.JPEG,
        'JPG': SaveFormat.JPEG,
        'PNG': SaveFormat.PNG,
        'WEBP': SaveFormat.WEBP,
      };

      const targetFormat = formatMap[format];
      if (!targetFormat) throw new Error(`Formato ${format} não suportado`);

      setProgress(35);

      const result = await manipulateAsync(
        selectedFile.uri,
        [],
        {
          compress: 0.9,
          format: targetFormat,
          base64: false,
        }
      );

      setProgress(70);

      const extension = format.toLowerCase();
      const newFileName = `converted_${Date.now()}.${extension}`;
      const newFilePath = `${FileSystem.documentDirectory}${newFileName}`;

      await FileSystem.moveAsync({
        from: result.uri,
        to: newFilePath,
      });

      setProgress(100);

      setConvertedFile({
        uri: newFilePath,
        name: newFileName,
        format: format,
        originalName: selectedFile.name,
      });

      Alert.alert('Sucesso', `Imagem convertida para ${format}!`);
    } catch (error) {
      console.error('Erro na conversão:', error);
      Alert.alert('Erro', `Falha na conversão: ${error.message || 'desconhecido'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const convertFile = async (format) => {
    if (!selectedFile) {
      Alert.alert('Atenção', 'Por favor, selecione uma imagem primeiro.');
      return;
    }

    if (selectedFile.mimeType?.includes('image')) {
      await convertImage(format);
    } else {
      Alert.alert('Erro', 'Apenas imagens são suportadas.');
    }
  };

  const saveFile = async () => {
    if (!convertedFile) return;

    try {
      const asset = await MediaLibrary.createAssetAsync(convertedFile.uri);
      await MediaLibrary.createAlbumAsync('Conversões', asset, false);
      Alert.alert('Salvo!', 'Arquivo salvo na galeria com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert(
        'Erro ao salvar',
        `Não foi possível salvar: ${Platform.OS === 'android' ? 'verifique as permissões' : 'tente novamente'}`
      );
    }
  };

  const renderFormatButtons = () => (
    <View style={styles.formatGrid}>
      {['JPEG', 'JPG', 'PNG', 'WEBP'].map((format) => (
        <TouchableOpacity
          key={format}
          style={[
            styles.formatButton,
            isConverting && { opacity: 0.6 }
          ]}
          onPress={() => convertFile(format)}
          disabled={isConverting}
        >
          <MaterialIcons 
            name="image" 
            size={24} 
            color={isConverting ? '#94a3b8' : '#6366f1'} 
          />
          <Text style={styles.formatText}>{format}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialIcons name="transform" size={32} color="#6366f1" />
          <Text style={styles.title}>Conversor de Imagens</Text>
          <Text style={styles.subtitle}>Converta imagens rapidamente</Text>
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
          <MaterialIcons name="cloud-upload" size={24} color="#fff" />
          <Text style={styles.uploadText}>Selecionar Imagem</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
              {selectedFile.name}
            </Text>
          </View>
        )}

        {selectedFile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Converter para:</Text>
            {renderFormatButtons()}
          </View>
        )}

        {isConverting && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.progressText}>Processando imagem...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
        )}

        {convertedFile && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>✅ Conversão Concluída!</Text>
            <Text style={styles.resultFileName} numberOfLines={1} ellipsizeMode="middle">
              {convertedFile.name}
            </Text>
            <TouchableOpacity style={styles.saveButton} onPress={saveFile}>
              <MaterialIcons name="save-alt" size={20} color="#fff" />
              <Text style={styles.saveText}>Salvar na Galeria</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ✅ BANNER (sempre no final, fora do ScrollView) */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={BANNER_ID}
          size={BannerAdSize.FULL_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => console.log('Banner carregado')}
          onAdFailedToLoad={(error) => console.warn('Erro no banner:', error)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // espaço para banner
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fileInfo: {
    backgroundColor: '#e2e8f0',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  fileName: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  formatButton: {
    width: (width - 60) / 2,
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  formatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    color: '#475569',
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  progressPercent: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748b',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 10,
  },
  resultFileName: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
});

export default MediaConverter;

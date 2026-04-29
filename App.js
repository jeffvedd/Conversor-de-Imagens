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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const { width } = Dimensions.get('window');

const MediaConverter = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [convertedFile, setConvertedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    if (permissionResponse?.status !== 'granted') {
      requestPermission();
    }
  }, []);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          extension: file.name.split('.').pop().toLowerCase(),
        });
        setConvertedFile(null);
        setProgress(0);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not select file');
      console.log('Error selecting file:', error);
    }
  };

  const convertImage = async (format) => {
    if (!selectedFile) return;

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
      if (!targetFormat) {
        throw new Error(`Format ${format} not supported`);
      }

      setProgress(30);

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

      const extension = format.toLowerCase() === 'jpg' ? 'jpg' : format.toLowerCase();
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
        type: 'image',
      });

      Alert.alert('Success', `Image converted to ${format}`);
    } catch (error) {
      console.error('Image conversion error:', error);
      Alert.alert('Error', `Conversion failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const convertFile = async (format) => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    if (selectedFile.mimeType?.includes('image')) {
      await convertImage(format);
    } else {
      Alert.alert('Error', 'File type not supported');
    }
  };

  const saveFile = async () => {
    if (!convertedFile) return;

    try {
      const asset = await MediaLibrary.createAssetAsync(convertedFile.uri);
      await MediaLibrary.createAlbumAsync('Conversions', asset, false);
      Alert.alert('Success', 'File saved to gallery');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Could not save file');
    }
  };

  const renderFormatButtons = () => (
    <View style={styles.formatGrid}>
      {['JPEG', 'JPG', 'PNG', 'WEBP'].map((format) => (
        <TouchableOpacity
          key={format}
          style={styles.formatButton}
          onPress={() => convertFile(format)}
          disabled={isConverting}
        >
          <MaterialIcons 
            name="image" 
            size={24} 
            color={isConverting ? '#94a3b8' : '#6366f1'} 
          />
          <Text style={[styles.formatText, isConverting && styles.disabledText]}>
            {format}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialIcons name="transform" size={32} color="#6366f1" />
          <Text style={styles.title}>Image Converter</Text>
          <Text style={styles.subtitle}>Convert images to different formats</Text>
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
          <MaterialIcons name="cloud-upload" size={24} color="#fff" />
          <Text style={styles.uploadText}>Select Image</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <View style={styles.fileIcon}>
              <MaterialIcons name="image" size={24} color="#6366f1" />
            </View>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              <Text style={styles.fileType}>
                {selectedFile.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'} • 
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
          </View>
        )}

        {selectedFile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Convert To:</Text>
            {renderFormatButtons()}
          </View>
        )}

        {isConverting && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.progressText}>Processing image...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
        )}

        {convertedFile && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Conversion Complete!</Text>
            <View style={styles.resultCard}>
              <View style={styles.resultIcon}>
                <MaterialIcons name="check-circle" size={24} color="#10b981" />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultFileName} numberOfLines={1}>{convertedFile.name}</Text>
                <Text style={styles.resultFormat}>Format: {convertedFile.format}</Text>
                <Text style={styles.resultOriginal}>Original: {convertedFile.originalName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={saveFile}>
              <MaterialIcons name="save-alt" size={20} color="#fff" />
              <Text style={styles.saveText}>Save to Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: { 
    alignItems: 'center', 
    padding: 30, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0',
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginTop: 10,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#64748b', 
    marginTop: 5,
  },
  uploadButton: { 
    backgroundColor: '#6366f1', 
    margin: 20, 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 3,
  },
  uploadText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600', 
    marginLeft: 10,
  },
  fileInfo: { 
    backgroundColor: '#fff', 
    marginHorizontal: 20, 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    elevation: 1,
  },
  fileIcon: { 
    backgroundColor: '#ede9fe', 
    padding: 10, 
    borderRadius: 12, 
    marginRight: 15,
  },
  fileDetails: { 
    flex: 1,
  },
  fileName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1e293b', 
    marginBottom: 5,
  },
  fileType: { 
    fontSize: 14, 
    color: '#64748b',
  },
  section: { 
    margin: 20,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1e293b', 
    marginBottom: 15,
  },
  formatGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
  },
  formatButton: { 
    backgroundColor: '#fff', 
    width: (width - 60) / 2, 
    padding: 15, 
    marginVertical: 5, 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#c7d2fe', 
    elevation: 2,
  },
  formatText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#6366f1', 
    marginTop: 8,
  },
  disabledText: { 
    color: '#94a3b8',
  },
  progressContainer: { 
    alignItems: 'center', 
    padding: 30, 
    margin: 20, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    elevation: 2,
  },
  progressText: { 
    marginTop: 15, 
    fontSize: 16, 
    color: '#64748b', 
    marginBottom: 15,
  },
  progressBar: { 
    width: '100%', 
    height: 8, 
    backgroundColor: '#e2e8f0', 
    borderRadius: 4, 
    overflow: 'hidden',
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#6366f1', 
    borderRadius: 4,
  },
  progressPercent: { 
    marginTop: 10, 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#6366f1',
  },
  resultContainer: { 
    margin: 20,
  },
  resultTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginBottom: 15, 
    textAlign: 'center',
  },
  resultCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#bbf7d0', 
    elevation: 2,
  },
  resultIcon: { 
    backgroundColor: '#dcfce7', 
    padding: 10, 
    borderRadius: 12, 
    marginRight: 15,
  },
  resultInfo: { 
    flex: 1,
  },
  resultFileName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1e293b', 
    marginBottom: 5,
  },
  resultFormat: { 
    fontSize: 14, 
    color: '#64748b', 
    marginBottom: 3,
  },
  resultOriginal: { 
    fontSize: 12, 
    color: '#94a3b8',
  },
  saveButton: { 
    backgroundColor: '#10b981', 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 15, 
    elevation: 3,
  },
  saveText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600', 
    marginLeft: 10,
  },
});

export default MediaConverter;

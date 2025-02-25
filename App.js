import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import ViewShot, { captureRef } from 'react-native-view-shot';

export default function App() {
  const [qrValue, setQrValue] = useState('https://example.com');
  const qrCodeRef = useRef(null);
  const [isData, setIsdata] = useState(true);

  const qrVal = async (data) => {
    if(data==''){
      setIsdata(false);
    }else{
      setIsdata(true);
    } 
    setQrValue(data);
  }

  const clearText = async () => {
    setIsdata(false);
    setQrValue('');
  }

  const captureAndDownload = async () => {
    try {
      // Capture the QR code as an image
      const uri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1.0,
      });

      // Define the file URI in the document directory
      const fileUri = `${FileSystem.documentDirectory}qr_code.png`;

      // Copy the file to the document directory
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      // Request permissions for accessing the media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        // Create the asset and save it to the gallery
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync('Download', asset, false);
        Alert.alert('QR Code Saved', 'QR code has been saved to your gallery!');
      } else {
        Alert.alert('Permission Denied', 'You need to allow access to your media library to save the QR code.');
      }
    } catch (error) {
      console.error('Failed to capture the view:', error);
      Alert.alert('Error', 'Failed to capture and save QR code.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate Your QR Code</Text>
      <TextInput
        style={styles.input}
        onChangeText={qrVal}
        value={qrValue}
        placeholder="Enter text for QR code"
      />
      {isData ? (
        <>
          <ViewShot ref={qrCodeRef} style={styles.qrWrapper}>
            <QRCode
              value={qrValue}
              size={200}
              color="black"
              backgroundColor="white"
            />
          </ViewShot>
          <View style={{marginTop: 18}} />
          <Button title="Download QR Code" onPress={captureAndDownload} />
          <View style={{marginTop: 18}} />
          <Button title="Clear"  onPress={clearText} />
        </>
      ) : (
        <Text style={styles.message}>Please enter text to generate a QR code.</Text>
      )}
      
    </View>
     
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    width: '80%',
    paddingHorizontal: 10,
  },
  qrWrapper: {
    backgroundColor: 'white',
    padding: 8, // Adds a margin around the QR code
  },
});

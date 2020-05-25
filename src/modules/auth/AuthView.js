import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  UIManager,
  Button,
  Linking,
} from 'react-native';
import { refresh } from 'react-native-app-auth';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';

import { fonts, colors } from '../../styles';
import { Text } from '../../components/StyledText';
import {
  client_id,
  redirect_url,
  modelObjectPath,
  snapshotPath,
  textureIdxPaths,
  tokenAPI,
  uploadAPI,
  authURL
} from '../Constants';
UIManager.setLayoutAnimationEnabledExperimental &&
  UIManager.setLayoutAnimationEnabledExperimental(true);

export default function AuthScreen({ isExtended, setIsExtended }) {
  const [access_token, setAccessToken] = useState('');
  const [refresh_token, setRefreshToken] = useState('');
  const [authCode, setAuthCode] = useState(null);
  const [requestID, setRequestID] = useState('');

  useEffect(() => {
    Linking.addEventListener('url', url => console.log(url));
    retrieveToken();
  });

  const retrieveToken = async () => {
    const accessToken = await AsyncStorage.getItem('access_token');
    // const refreshToken = await AsyncStorage.getItem('refresh_token');
    setAccessToken(accessToken);
    // setRefreshToken(refreshToken);
    console.log('Access Token', accessToken);
  }

  const handleWebViewNavigationStateChange = newNavState => {
    const { url } = newNavState;
    console.log(url);
    if (url.includes('http://localhost:3000/?code')) {
      const code = url.split('=').slice(-1)[0];
      setAuthCode(prevCode => (code));
      fetchToken(code);
    }
  };

  const fetchToken = (code = authCode) => {
    if (!code) return;
    console.log(code);

    const formData = new FormData();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', client_id);
    formData.append('redirect_uri', redirect_url);
    formData.append('code', code);
    axios({
      url: tokenAPI,
      method: 'POST',
      data: formData,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    }).then(async (res) => {
      const tokenObj = res.data;
      console.log(tokenObj);
      setAccessToken(tokenObj.access_token);
      setRefreshToken(tokenObj.refresh_token);
      try {
        await AsyncStorage.setItem('access_token', tokenObj.access_token);
        await AsyncStorage.setItem('refresh_token', tokenObj.refresh_token);
      } catch (e) { console.log(e) }
    }).catch((e) => {
      console.log(e);
    })
  };

  const uploadData = () => {
    console.log('Uploading');
    let model_info = {
      name: 'Red Baron test',
      description: 'A good test of upload API',
    };
    let materials = [{ textures: { diff: { new_index: 0 } } }];
    const formData = new FormData();
    formData.append('model_info', JSON.stringify(model_info));
    formData.append('materials', JSON.stringify(materials));
    textureIdxPaths.forEach(function (path, index) {
      formData.append('new-tex-idx-' + index.toString(), {
        uri: path,
        type: 'image/png',
        name: path.split('/').slice(-1)[0],
      });
  });
    
    formData.append('snapshot', {
      uri: snapshotPath,
      type: 'image/png',
      name: snapshotPath.split('/').slice(-1)[0],
    });
    formData.append('model', {
      uri: modelObjectPath,
      type: 'model/obj',
      name: modelObjectPath.split('/').slice(-1)[0],
    });
    axios({
      url: uploadAPI,
      method: 'POST',
      data: formData,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Bearer ' + access_token,
      },
    })
      .then(function (response) {
        console.log('response data : \n', response.data);
        const reqID = response.data.requestID;
        setRequestID(reqID);
      })
      .catch(function (error) {
        console.log('upload error: \n', error);
      });
  };

  const revoke = async () => {
    try {
      setAccessToken(null);
      await AsyncStorage.removeItem('access_token');
    } catch (error) {
      Alert.alert('Failed to revoke token', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {authCode === null && !access_token ? (
        <WebView
          source={{ uri: authURL }}
          style={styles.webview}
          onNavigationStateChange={handleWebViewNavigationStateChange}
        />
      ) : (
          <View style={styles.mainLayout}>
            <View style={styles.authInfoLayout}>

              {
                requestID.length > 0 &&
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{fontSize: 30, color: 'blue'}}>Success!</Text>
                  <Text style={{fontSize: 15, marginTop: 20}}>Upload RequestID</Text>
                  <Text style={{fontSize: 15, marginTop: 5}}>
                    {requestID}
                  </Text>
                </View>
              }

            </View>
            <View style={styles.authButtonLayout}>
              {!access_token && (
                <Button
                  onPress={fetchToken}
                  title="Get AccessToken"
                  color="#017CC0"
                />
              )}
              {!!refresh_token && (
                <Button onPress={refresh} title="Refresh" color="#24C2CB" style={styles.navButton} />
              )}
              {!!access_token && (
                <Button onPress={revoke} title="Revoke Token" color="#EF525B" style={styles.navButton} />
              )}
              {!!access_token && (
                <Button onPress={uploadData} title="Upload Data" color="#6F52FB" style={styles.navButton} />
              )}
            </View>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    flex: 1,
    marginHorizontal: -20,
  },
  section: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLarge: {
    flex: 2,
    justifyContent: 'space-around',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: 'center',
  },
  description: {
    padding: 15,
    lineHeight: 25,
  },
  titleDescription: {
    color: '#19e7f7',
    textAlign: 'center',
    fontFamily: fonts.primaryRegular,
    fontSize: 15,
  },
  title: {
    marginTop: 30,
  },
  price: {
    marginBottom: 5,
  },
  priceLink: {
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  mainLayout: {
    flexDirection: 'column',
    width: '100%',
    flex: 1,
  },
  authInfoLayout: {
    flex: 8,
  },
  authButtonLayout: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: "center",
    alignContent: 'center',
    display: 'flex'
  },
  navButton: {
    flex: 1,
    backgroundColor: 'red',
    marginHorizontal: 50
  }
});

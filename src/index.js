import { View, Text, StyleSheet,TextInput, TouchableOpacity,Keyboard} from 'react-native'
import React, {useState} from 'react';
import axios from 'axios';
import DropDownPicker from 'react-native-dropdown-picker';

import { LinearGradient } from 'expo-linear-gradient';


const Translator = () => {
    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [fromLanguage, setFromLanguage] = useState('English');
    const [toLanguage, setToLanguage] = useState('Hindi');
    const [openFrom, setOpenFrom] = useState(false);
    const [openTo, setOpenTo] = useState(false);

    const API_KEY = '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'

    const translateText = async () => {
        try{
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'user',
                            content: `Translate the following text from ${fromLanguage} to ${toLanguage}: "${inputText}"`
                        },
                        {
                            role: 'assistant',
                            content: 'translate'
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_KEY}`
                    }
                }
            );

            setTranslatedText(response.data.choices[0].message.content);
            Keyboard.dismiss(); // Dismiss the keyboard after translation

        } catch (error) {
            console.error('Error translating text:', error);
            setTranslatedText('Translation failed. Please try again.');
        }   
    }
     const languages = [
        { label: 'English', value: 'English' },
        { label: 'Hindi', value: 'Hindi' },
        { label: 'Spanish', value: 'Spanish' },
        { label: 'French', value: 'French' },
        { label: 'German', value: 'German' },
        { label: 'Chinese', value: 'Chinese' },
        { label: 'Japanese', value: 'Japanese' },
        { label: 'Korean', value: 'Korean' },
        { label: 'Arabic', value: 'Arabic' },
        { label: 'Portuguese', value: 'Portuguese' },
        { label: 'Russian', value: 'Russian' },
        { label: 'Italian', value: 'Italian' },
        { label: 'Bengali', value: 'Bengali' },
        { label: 'Urdu', value: 'Urdu' },
        { label: 'Turkish', value: 'Turkish' },
        { label: 'Gujarati', value: 'Gujarati' },
        { label: 'Marathi', value: 'Marathi' },
        { label: 'Tamil', value: 'Tamil' },
        { label: 'Telugu', value: 'Telugu' },
        { label: 'Malayalam', value: 'Malayalam' },
        ];


    return (
        <View style={styles.container}>
        <Text style={styles.title}>BridgeTalk<Text style={{ color: '#6f3ff5' }}>.</Text></Text>
        <View style={styles.DropDowncontainer}>
            <DropDownPicker
                open={openFrom}
                value={fromLanguage}
                setOpen={setOpenFrom}
                setValue={setFromLanguage}
                items={languages}
                placeholder="From Language"
                zIndex={3000}
                zIndexInverse={1000}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropList}
                containerStyle={{ flex: 1, alignItems: 'center' }}
                />

                <DropDownPicker
                open={openTo}
                value={toLanguage}
                setOpen={setOpenTo}
                setValue={setToLanguage}
                items={languages}
                placeholder="To Language"
                zIndex={2000}
                zIndexInverse={2000}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropList}
                containerStyle={{ flex: 1, alignItems: 'center' }}
                />

            
        </View>
        <TextInput
            style={{ height: 200,marginBottom:50,marginTop:30, borderColor: 'gray', borderWidth: 1, width: '90%', padding: 10, color: '#fff', backgroundColor: '#333', borderRadius: 10 }}
            placeholder="Enter text to translate"
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={text => setInputText(text)}
            multiline
        />
        <TouchableOpacity 
            
            onPress={translateText}
        >
            <LinearGradient
                colors={['#5029FB', '#5029FB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBar}
            >
            <Text style={styles.buttonText}>Translate</Text>
            </LinearGradient>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, marginTop: 50, textAlign: 'center' }}>
            {translatedText ? `Translated Text:
${translatedText}` :'Translated will appear here'}
        </Text>
    
        </View>
    )
}

export default Translator

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 40,
  },

  DropDowncontainer:{
    flexDirection: 'row',
    
   
    justifyContent: 'space-around',
    marginBottom: 20,
 },
dropdown: {
    backgroundColor: '#fff',
    width: 150,
    height: 50,
    borderRadius: 10,

    marginHorizontal: 10,
    },
button: {
  width: '80%',
  borderRadius: 25,
  overflow: 'hidden',
  marginTop: 90,
  marginHorizontal: 50,
},

gradientBar: {
  paddingVertical: 13,
  paddingHorizontal: 90,
  borderRadius: 20,
  alignItems: 'center',
justifyContent: 'center',
    marginLeft: 10,
},

buttonText: {
  color: 'white',
  fontSize: 18,
  textAlign: 'center',
  fontWeight: '600',
  fontFamily: 'monospace',
  
},
            
});

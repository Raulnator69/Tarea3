document.addEventListener('DOMContentLoaded', () => {
    let mediaRecorder;
    let audioChunks = [];

    const startBtn = document.getElementById('start-recording');
    const stopBtn = document.getElementById('stop-recording');
    const audioFileInput = document.getElementById('audio-file-input');
    const audioContainer = document.getElementById('audio-container'); 
    const transcriptionResult = document.getElementById('transcription-result');
    const encryptedText = document.getElementById('encrypted-text');
    const transcriptionLetterCount = document.getElementById('transcription-letter-count');
    const encryptedLetterCount = document.getElementById('encrypted-letter-count');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Función para contar letras (sin incluir espacios)
    function countLetters(text) {
        return text.replace(/\s/g, '').length;
    }

    // Función para actualizar el contador de letras de un área de texto
    function updateLetterCount(textarea, counter) {
        counter.textContent = `Letras: ${countLetters(textarea.value)}`;
    }

    // Función para actualizar ambos contadores de letras al cambiar los contenidos
    function updateCountersOnContentChange() {
        updateLetterCount(transcriptionResult, transcriptionLetterCount);
        updateLetterCount(encryptedText, encryptedLetterCount);
    }

    // Función para iniciar la grabación
    startBtn.onclick = async () => {
        // Limpiar contenido previo
        transcriptionResult.value = 'Texto transcrito aparecerá aquí...';
        encryptedText.value = 'Texto cifrado aparecerá aquí...';
        audioContainer.innerHTML = ''; // Limpiar el contenedor del reproductor
        audioFileInput.value = ''; // Limpiar el input de archivo

        // Llama a updateCountersOnContentChange al limpiar el contenido
        updateCountersOnContentChange();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioContainer.innerHTML = `<audio controls src="${audioUrl}"></audio>`;
            audioChunks = [];

            // Mostrar el indicador de carga
            loadingIndicator.style.display = 'block';
            alert('Transcribiendo el audio. Este proceso puede tardar unos segundos...');

            // Subir audio y transcribir
            try {
                const transcript = await uploadAndTranscribe(audioBlob);
                transcriptionResult.value = `Texto transcrito: ${transcript}`;

                // Cifrado AES-128
                const encrypted = CryptoJS.AES.encrypt(transcript, 'clave-secreta').toString();
                encryptedText.value = `Texto cifrado: ${encrypted}`;

                // Actualizar contadores después de modificar los valores
                updateCountersOnContentChange();
            } catch (error) {
                transcriptionResult.value = 'Error en la transcripción. Inténtalo de nuevo.';
            } finally {
                // Ocultar el indicador de carga
                loadingIndicator.style.display = 'none';
            }
        };

        mediaRecorder.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;
    };

    stopBtn.onclick = () => {
        mediaRecorder.stop();
        startBtn.disabled = false;
        stopBtn.disabled = true;
    };

    // Procesar el archivo de audio seleccionado
    audioFileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            transcriptionResult.value = 'Texto transcrito aparecerá aquí...';
            encryptedText.value = 'Texto cifrado aparecerá aquí...';
            audioContainer.innerHTML = '';
            updateCountersOnContentChange();

            const audioUrl = URL.createObjectURL(file);
            audioContainer.innerHTML = `<audio controls src="${audioUrl}"></audio>`;

            loadingIndicator.style.display = 'block';
            alert('Transcribiendo el audio. Este proceso puede tardar unos segundos...');

            try {
                const transcript = await uploadAndTranscribe(file);
                transcriptionResult.value = `Texto transcrito: ${transcript}`;

                const encrypted = CryptoJS.AES.encrypt(transcript, 'clave-secreta').toString();
                encryptedText.value = `Texto cifrado: ${encrypted}`;

                // Actualizar contadores después de modificar los valores
                updateCountersOnContentChange();
            } catch (error) {
                transcriptionResult.value = 'Error en la transcripción. Inténtalo de nuevo.';
            } finally {
                loadingIndicator.style.display = 'none';
            }
        }
    };

    // Función para subir y transcribir el audio
    async function uploadAndTranscribe(audioBlob) {
        const response = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: {
                'Authorization': '15bb6ac1b78c4214b8aa95f190aa2bf8'
            },
            body: audioBlob
        });
        const { upload_url } = await response.json();

        const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'Authorization': '15bb6ac1b78c4214b8aa95f190aa2bf8',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio_url: upload_url,
                language_code: 'es' 
            })
        });
        const { id } = await transcribeResponse.json();

        let transcript;
        while (true) {
            const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
                headers: {
                    'Authorization': '15bb6ac1b78c4214b8aa95f190aa2bf8'
                }
            });
            const statusData = await statusResponse.json();
            if (statusData.status === 'completed') {
                transcript = statusData.text;
                break;
            } else if (statusData.status === 'failed') {
                throw new Error('Error en la transcripción');
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        return transcript;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Obtener los elementos
    const transcriptionResult = document.getElementById('transcription-result');
    const encryptedText = document.getElementById('encrypted-text');
    const copyTranscriptionBtn = document.getElementById('copy-transcription');
    const copyEncryptedBtn = document.getElementById('copy-encrypted');

    // Función para copiar al portapapeles
    function copyToClipboard(textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // Para móviles
        document.execCommand('copy');
        alert('Texto copiado al portapapeles');
    }

    // Manejar clic en botón de copiar transcripción
    copyTranscriptionBtn.onclick = () => {
        copyToClipboard(transcriptionResult);
    };

    // Manejar clic en botón de copiar texto cifrado
    copyEncryptedBtn.onclick = () => {
        copyToClipboard(encryptedText);
    };
});

document.addEventListener('DOMContentLoaded', () => {
    // Obtener los elementos
    const transcriptionResult = document.getElementById('transcription-result');
    const encryptedText = document.getElementById('encrypted-text');
    const transcriptionLetterCount = document.getElementById('transcription-letter-count');
    const encryptedLetterCount = document.getElementById('encrypted-letter-count');

    // Función para contar letras (sin incluir espacios)
    function countLetters(text) {
        return text.replace(/\s/g, '').length;
    }

    // Función para actualizar el contador de letras de un área de texto
    function updateLetterCount(textarea, counter) {
        counter.textContent = `Letras: ${countLetters(textarea.value)}`;
    }

    // Llamar a la función de actualización cada vez que el contenido cambie
    transcriptionResult.addEventListener('input', () => {
        updateLetterCount(transcriptionResult, transcriptionLetterCount);
    });

    encryptedText.addEventListener('input', () => {
        updateLetterCount(encryptedText, encryptedLetterCount);
    });

    // Llamar a la función de actualización programáticamente después de transcribir o cifrar
    function updateCountersOnContentChange() {
        updateLetterCount(transcriptionResult, transcriptionLetterCount);
        updateLetterCount(encryptedText, encryptedLetterCount);
    }

    // Llama a updateCountersOnContentChange() al asignar nuevos valores a los textarea
    async function handleAudioTranscription() {
        transcriptionResult.value = 'Texto transcrito: ejemplo de texto';
        encryptedText.value = 'Texto cifrado: ejemplo de cifrado';
        updateCountersOnContentChange();
    }
});

const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const { connectToDb, getDb } = require('./db');
const { uploadFileToGridFS } = require('./db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const nodemailer = require('nodemailer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');


const chatbotController = require('./controllers/chatbotController');
const questionnaireController = require('./controllers/questionnaireController');

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage })

// init app & middleware
const app = express();
app.use(express.json());
app.use(cors());
// db connection
let db;
const PORT = process.env.PORT || 3000; 


connectToDb((err) => {  
    if (!err) {
        app.listen(PORT, "0.0.0.0", function (){
            console.log(`Servidor escuchando en el puerto ${PORT}`);
        });
        db = getDb();
    }
});

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'chatbotevaluator@gmail.com',
        pass: 'djln cptp ctph pfpt '
    }
});

app.get('/', (req, res) => {
    res.send('Bienvenido a la página inicial');
});

// VIEW QUESTIONNAIRE
app.get('/questionnaires/:questionnaireId', async (req, res) => {
    const questionnaireId = req.params.questionnaireId;
    try {
        const questionnaire = await questionnaireController.getQuestionnaireInfoWOUser(questionnaireId);
        
        if (!questionnaire) {
            return res.status(404).json({ error: 'Questionnaire not found' });
        }

        res.status(200).json(questionnaire); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// ROUTES FOR USERS
app.get('/users', (req, res) => { 
    let users = []; 
    console.log('busco users');
    db.collection('users')
        .find() 
        .sort({ name: 1 })
        .forEach(user => users.push(user))
        .then(() => { 
            res.status(200).json(users);
        })
        .catch(() => { 
            res.status(500).json({ error: 'Could not fetch documents' });
        });
});

app.get('/users/:id', (req, res) => { 
    if (ObjectId.isValid(req.params.id)) {
        db.collection('users')
            .findOne({ _id: ObjectId(req.params.id) })
            .then(doc => {
                res.status(200).json(doc);
            })
            .catch(err => {
                res.status(500).json({ error: 'Could not fetch the document' });
            });
    } else {
        res.status(500).json({ error: 'Not a valid doc id' });
    }
});

app.post('/users', (req, res) => { 
    const user = req.body;

    // save it to db
    db.collection('users')
        .insertOne(user)
        .then(result => {
            res.status(201).json(result);
        }) 
        .catch(err => {
            res.status(500).json({ error: 'Could not create a new document' });
        });
});

app.delete('/users/:id', (req, res) => { 
    if (ObjectId.isValid(req.params.id)) {
        db.collection('users')
            .deleteOne({ _id: ObjectId(req.params.id) })
            .then(result => {
                res.status(200).json(result);
            })
            .catch(err => {
                res.status(500).json({ error: 'Could not delete doc' });
            });
    } else {
        res.status(500).json({ error: 'Not a valid doc id' });
    }
});

app.patch('/users/:id', (req, res) => { 
    const updates = req.body;

    if (ObjectId.isValid(req.params.id)) {
        db.collection('users')
            .updateOne({ _id: ObjectId(req.params.id) }, { $set: updates })
            .then(result => {
                res.status(200).json(result);
            })
            .catch(err => {
                res.status(500).json({ error: 'Could not update doc' });
            });
    } else {
        res.status(500).json({ error: 'Not a valid doc id' });
    }
});

// RUTA PARA OBTENER LA AGENDA DE UN USUARIO
app.get('/users/:userId/agenda', (req, res) => {
    const userId = req.params.userId;

    if (ObjectId.isValid(userId)) {
        db.collection('agenda')
            .find({ userId: ObjectId(userId) })
            .toArray()
            .then(data => {
                res.status(200).json(data);
            })
            .catch(err => {
                res.status(500).json({ error: 'Could not fetch the agenda' });
            });
    } else {
        res.status(500).json({ error: 'Not a valid user id' });
    }
});

// RUTA PARA AGREGAR UN PARTICIPANTE A LA AGENDA DE UN USUARIO
app.post('/users/:userId/agenda', (req, res) => {
    const userId = req.params.userId;
    const participant = req.body;

    if (ObjectId.isValid(userId)) {
        participant.userId = ObjectId(userId);

        db.collection('agenda')
            .insertOne(participant)
            .then(result => {
                res.status(201).json({ message: 'Participant added to agenda successfully', insertedId: result.insertedId });
            })
            .catch(err => {
                res.status(500).json({ error: 'Could not add participant to agenda' });
            });
    } else {
        res.status(500).json({ error: 'Not a valid user id' });
    }
});

// RUTA PARA ACTUALIZAR UN PARTICIPANTE EN LA AGENDA DE UN USUARIO
app.patch('/users/:userId/agenda/:participantId', (req, res) => {
    const userId = req.params.userId;
    const participantId = req.params.participantId;
    const updateData = req.body;

    if (ObjectId.isValid(userId) && ObjectId.isValid(participantId)) {
        db.collection('agenda')
            .updateOne(
                { _id: ObjectId(participantId), userId: ObjectId(userId) },
                { $set: updateData }
            )
            .then(result => {
                if (result.matchedCount === 0) {
                    res.status(404).json({ message: 'No participant found with that ID' });
                } else {
                    res.status(200).json({ message: 'Participant updated successfully' });
                }
            })
            .catch(err => {
                res.status(500).json({ error: 'Could not update participant' });
            });
    } else {
        res.status(400).json({ error: 'Invalid user ID or participant ID' });
    }
});

// RUTA PARA ELIMINAR UN PARTICIPANTE DE LA AGENDA DE UN USUARIO
app.delete('/users/:userId/agenda/:participantId', (req, res) => {
    const userId = req.params.userId;
    const participantId = req.params.participantId;

    if (ObjectId.isValid(userId) && ObjectId.isValid(participantId)) {
        db.collection('agenda')
            .deleteOne({ _id: ObjectId(participantId), userId: ObjectId(userId) })
            .then(result => {
                if (result.deletedCount === 0) {
                    res.status(404).json({ message: 'No participant found with that ID' });
                } else {
                    res.status(200).json({ message: 'Participant deleted successfully' });
                }
            })
            .catch(err => {
                res.status(500).json({ error: 'Could not delete participant' });
            });
    } else {
        res.status(400).json({ error: 'Invalid user ID or participant ID' });
    }
});

// RUTA PARA OBTENER ID PARTICIPANTE
app.get('/users/:userId/find-participant', (req, res) => {
    const userId = req.params.userId;
    const name = req.query.name;
    const surname = req.query.surname;
    const email = req.query.email;

    try {
        const participant = await db.collection('agenda')
            .findOne({ userId: ObjectId(userId),
                name: name,
                surname: surname,
                email: email});

        if (participant) {
            res.status(200).json(participant);
        } else {
            res.status(404).json({ message: 'Participant not found' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/send-email', async (req, res) => {
    const { userId, selectedParticipants, emailTitle, emailText, chatbotId } = req.body;

    try {
        const chatbot = await chatbotController.getChatbotById(chatbotId);
        if (!chatbot) {
            return res.status(404).json({ error: 'Chatbot not found' });
        }

        // Obtener cuestionarios asociados al chatbot
        const questionnaires = await chatbotController.getLinkedQuestionnaires(chatbotId);
        console.log(questionnaires);

        const questionnairesName = [];
        for (const questionnaire of questionnaires) {
            const info = await questionnaireController.getQuestionnaireInfo(userId, questionnaire);
            questionnairesName.push(info.name);
        }

        // Insertar los datos "active" en la base de datos y enviar correos electrónicos
        const currentDate = new Date();
        const emailPromises = selectedParticipants.map(async participant => {
            try {
                // Insertar datos "active" en la base de datos
                const activeData = {
                    userId: userId,
                    chatbotId: chatbotId,
                    questionnaires: questionnaires,
                    questionnairesName: questionnairesName,
                    date: currentDate,
                    participantId: participant.id
                };
                const activeResult = await db.collection('active').insertOne(activeData);

                // Obtener el ID del documento "active" insertado
                const activeId = activeResult.insertedId;

                // Generar el enlace con el ID del objeto "active"
                const chatbotLink = `http://localhost:3000/interact/${activeId}`;

                // Configurar opciones del correo electrónico
                const mailOptions = {
                    to: participant.email,
                    subject: emailTitle,
                    text: `${emailText}\n\nChat with the chatbot: ${chatbotLink}`,
                };

                // Enviar correo electrónico
                const info = await transporter.sendMail(mailOptions);
                console.log('Email sent to', participant.email, ':', info.response);
            } catch (error) {
                console.error('Error sending email to', participant.email, ':', error);
                throw error; // Propagar el error para manejarlo más adelante si es necesario
            }
        });

        // Esperar a que se envíen todos los correos electrónicos
        await Promise.all(emailPromises);

        res.status(200).json({ message: 'Emails sent successfully and active data added to database' });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});



// ROUTE LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await db.collection('users').findOne({ username });

  if (!user) {
      return res.status(401).json({ message: 'Invalid username' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
  }
  res.status(200).json({ message: 'Login successful', user });
});

// ROUTE REGISTER
app.post('/register', async (req, res) => {
  const { name, surname, username, email, password, repeat } = req.body;

  if (password !== repeat) {
      return res.status(400).json({ message: 'Passwords do not match', passwordsMatch: false });
  }

  try {
      const existingUser = await db.collection('users').findOne({
          $or: [{ username }, { email }],
      });

      if (existingUser) {
          return res.status(400).json({ message: 'Username or email already in use' });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const newUser = {
          name,
          surname,
          username,
          email,
          passwordHash,
      };

      const result = await db.collection('users').insertOne(newUser);

      res.status(201).json({ message: 'Registration successful', insertedId: result.insertedId });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ROUTE CHATBOTS
// USER CREATES CHATBOT
app.post('/users/:userId/chatbots', upload.single('zipFile'), async (req, res) => {
    const userId = req.params.userId;
    if (!req.file) {
        return res.status(400).send('No zip file uploaded.');
    }

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    const requiredFiles = ['config.yml', 'domain.yml'];
    const requiredDirectories = ['models', 'data'];

    // Verificar la presencia de archivos y carpetas requeridas
    let hasAllRequiredFiles = requiredFiles.every(file => zipEntries.some(entry => entry.entryName.split('/').pop() === file));
    let hasAllRequiredDirectories = requiredDirectories.every(dir => zipEntries.some(entry => entry.isDirectory && entry.entryName.split('/')[0] === dir));

    if (!hasAllRequiredFiles || !hasAllRequiredDirectories) {
        let missingItems = [];
        if (!hasAllRequiredFiles) missingItems.push(...requiredFiles);
        if (!hasAllRequiredDirectories) missingItems.push(...requiredDirectories);
        return res.status(400).json({ error: `Missing required items: ${missingItems.join(', ')}` });
    }
    console.log("subo archivo a gridfs");
    // Subir archivo a GridFS
    const filename = `${req.body.name}-${new Date().toISOString()}.zip`; // Crea un nombre de archivo único
    console.log(filename);
    uploadFileToGridFS(req.file.buffer, filename, async (err, fileId) => {
        if (err) {
            console.error('Error uploading file to GridFS:', err);
            return res.status(500).json({ error: 'Failed to upload zip file' });
        }
        console.log("file uloaded to gridfs");

        const chatbotData = {
            name: req.body.name,
            version: req.body.version || "1.0",
            date: new Date(),
            zipFileId: fileId,
            userId
        };

        try {
            const db = getDb();
            const chatbotId = await db.collection('chatbots').insertOne(chatbotData);
            res.status(201).json({ chatbotId: chatbotId.insertedId, fileId });
        } catch (error) {
            console.error('Error creating chatbot:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
});


// OBTAIN USER'S CHATBOTS
app.get('/users/:userId/chatbots', async (req, res) => {
    const userId = req.params.userId;

    try {
        const chatbots = await chatbotController.getChatbotsByUserId(userId);
        res.status(200).json(chatbots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// VIEW CHATBOT
app.get('/users/:userId/chatbots/:chatbotId', async (req, res) => {
    const chatbotId = req.params.chatbotId;

    try {
        const chatbot = await chatbotController.getChatbotById(chatbotId);

        if (chatbot) {
            res.status(200).json(chatbot);
        } else {
            res.status(404).json({ message: 'Chatbot not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE CHATBOT BY ID
app.delete('/users/:userId/chatbots/:chatbotId', async (req, res) => {
    const chatbotId = req.params.chatbotId;

    try {
        const success = await chatbotController.deleteChatbot(chatbotId);

        if (success) {
            res.status(200).json({ message: 'Chatbot deleted successfully' });
        } else {
            res.status(404).json({ message: 'Chatbot not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// EDIT CHATBOT BY ID
app.patch('/users/:userId/chatbots/:chatbotId', async (req, res) => {
    const chatbotId = req.params.chatbotId;
    const updates= {
        name: req.body.name,
        version: req.body.version
    };

    try {
        const success = await chatbotController.updateChatbot(chatbotId, updates);

        if (success) {
            res.status(200).json({ message: 'Chatbot updated successfully' });
        } else {
            res.status(404).json({ message: 'Chatbot not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// USER CREATES QUESTIONNAIRE
app.post('/users/:userId/questionnaires', async (req, res) => {
    const userId = req.params.userId;
    const questionnaireData = req.body;

    try {
        const insertedId = await questionnaireController.createQuestionnaire({ ...questionnaireData, userId });
        res.status(201).json({ message: 'Questionnaire created successfully', insertedId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// OBTAIN USER'S QUESTIONNAIRES
app.get('/users/:userId/questionnaires', async (req, res) => {
    const userId = req.params.userId;

    try {
        const questionnaires = await questionnaireController.getQuestionnairesByUserId(userId);
        res.status(200).json(questionnaires);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE BY ID
app.delete('/users/:userId/questionnaires/:questionnaireId', async (req, res) => {
    const questionnaireId = req.params.questionnaireId;

    try {
        // Obtener los chatbots vinculados al cuestionario
        const chatbots = await chatbotController.getChatbotsByQuestionnaireId(questionnaireId);

        // Desvincular el cuestionario de todos los chatbots
        for (const chatbot of chatbots) {
            await chatbotController.unlinkQuestionnaire(chatbot._id, questionnaireId);
        }

        // Eliminar el cuestionario después de desvincularlo de los chatbots
        const deleted = await questionnaireController.deleteQuestionnaire(questionnaireId);

        if (deleted) {
            res.status(200).json({ message: 'Questionnaire deleted successfully' });
        } else {
            res.status(404).json({ error: 'Questionnaire not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// EDIT QUESTIONNAIRE
app.patch('/users/:userId/questionnaires/:questionnaireId', async (req, res) => {
    const questionnaireId = req.params.questionnaireId;
    const updates = req.body;

    try {
        const updated = await questionnaireController.updateQuestionnaire(questionnaireId, updates);

        if (updated) {
            res.status(200).json({ message: 'Questionnaire updated successfully' });
        } else {
            res.status(404).json({ error: 'Questionnaire not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// VIEW QUESTIONNAIRE
app.get('/users/:userId/questionnaires/:questionnaireId', async (req, res) => {
    const userId = req.params.userId;
    const questionnaireId = req.params.questionnaireId;
    console.log(userId);
    console.log(questionnaireId);
    try {
        const questionnaire = await questionnaireController.getQuestionnaireInfo(userId, questionnaireId);
        
        if (!questionnaire) {
            return res.status(404).json({ error: 'Questionnaire not found' });
        }

        res.status(200).json(questionnaire); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// LINK QUESTIONNAIRE TO CHATBOT
app.patch('/users/:userId/chatbots/:chatbotId/link-questionnaire', async (req, res) => {
    const chatbotId = req.params.chatbotId;
    const { questionnaireId } = req.body;
  
    try {
      const success = await chatbotController.linkQuestionnaire(chatbotId, questionnaireId);
  
      if (success) {
        res.status(200).json({ message: 'Questionnaire linked successfully' });
      } else {
        res.status(404).json({ message: 'Chatbot or Questionnaire not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // UNLINK QUESTIONNAIRE FROM CHATBOT
app.patch('/users/:userId/chatbots/:chatbotId/unlink-questionnaire', async (req, res) => {
    const chatbotId = req.params.chatbotId;
    const { questionnaireId } = req.body;

    try {
        const success = await chatbotController.unlinkQuestionnaire(chatbotId, questionnaireId);

        if (success) {
            res.status(200).json({ message: 'Questionnaire unlinked successfully' });
        } else {
            res.status(404).json({ message: 'Chatbot or Questionnaire not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// QUESTIONNAIRES ASSOCIATED TO CHATBOT
app.get('/users/:userId/chatbots/:chatbotId/questionnaires', async (req, res) => {
    const chatbotId = req.params.chatbotId;

    try {
        const questionnaires = await chatbotController.getLinkedQuestionnaires(chatbotId);
        res.status(200).json(questionnaires);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//ROUTE FOR OBTAINING ACTIVE TESTS
app.get('/users/:userId/active-tests', async (req, res) => {
    const userId = req.params.userId; 
    try {
        const activeTests = await db.collection('active').find({ userId: userId }).toArray();

        for (let i = 0; i < activeTests.length; i++) {
            let chatbotId = activeTests[i].chatbotId;
            let chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });
            if (chatbot) {
                activeTests[i].chatbotName = chatbot.name;
            } else {
                activeTests[i].chatbotName = 'Unknown'; 
            }

            let participantId = activeTests[i].participantId;
            let participant = await db.collection('agenda').findOne({ _id: ObjectId(participantId) });
            if (participant) {
                activeTests[i].participantName = participant.name+' '+participant.surname;
            } else {
                activeTests[i].participantName = 'Unknown'; 
            }

            let questionnaireId = activeTests[i].questionnaireId;
            let questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId) });
            if (questionnaire) {
                activeTests[i].questionnaireName = questionnaire.name;
            } else {
                activeTests[i].participantName = 'Unknown'; 
            }

            let date = new Date(activeTests[i].date);
            date.setHours(date.getHours()); 
            let formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${('0' + date.getMinutes()).slice(-2)}`;
            activeTests[i].date = formattedDate;
        }

        res.status(200).json(activeTests);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//ROUTE FOR OBTAINING COMPLETED TESTS
app.get('/users/:userId/completed-tests', async (req, res) => {
    const userId = req.params.userId; 
    try {
        const completedTests = await db.collection('complete').find({ userId: userId }).toArray();

        for (let i = 0; i < completedTests.length; i++) {
            let chatbotId = completedTests[i].chatbotId;
            let chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });
            if (chatbot) {
                completedTests[i].chatbotName = chatbot.name;
            } else {
                completedTests[i].chatbotName = 'Unknown'; 
            }

            let participantId = completedTests[i].participantId;
            let participant = await db.collection('agenda').findOne({ _id: ObjectId(participantId) });
            if (participant) {
                completedTests[i].participantName = participant.name+' '+participant.surname;
            } else {
                completedTests[i].participantName = 'Unknown'; 
            }

            let questionnaireId = completedTests[i].questionnaireId;
            let questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId) });
            if (questionnaire) {
                completedTests[i].type = questionnaire.type;
                completedTests[i].questionnaireName = questionnaire.name;
            } else {
                completedTests[i].type ='Unknown'; 
                completedTests[i].questionnaireName = 'Unknown';
            }

            let date = new Date(completedTests[i].date);
            date.setHours(date.getHours()); 
            let formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${('0' + date.getMinutes()).slice(-2)}`;
            completedTests[i].date = formattedDate;
            
        }

        res.status(200).json(completedTests);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/results/:resultId', async (req, res) => {
    const resultId = req.params.resultId;

    try {
        const results = await db.collection('results').findOne({ _id: ObjectId(resultId) });

        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/results', async (req, res) => {
    const chatbotId = req.query.chatbotId;
    const questionnaireId = req.query.questionnaireId;
    
    try {
        const filteredResults = await db.collection('results').find({ chatbotId: chatbotId, questionnaireId: questionnaireId }).toArray();
        res.status(200).json(filteredResults);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




module.exports = app;

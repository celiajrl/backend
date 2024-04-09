const { ObjectId } = require('mongodb');
const { getDb } = require('../db');


// Función de creación de chatbots, devuelve ID
async function createChatbot(chatbotData) {
    const db = getDb();
    const result = await db.collection('chatbots').insertOne(chatbotData);
    return result.insertedId;
}

// Función para obtener todos los chatbots de un usuario por ID de usuario
async function getChatbotsByUserId(userId) {
    const db = getDb();
    const chatbots = await db.collection('chatbots').find({ userId }).toArray();
    return chatbots;
}

// Función para obtener chatbot por id
async function getChatbotById(chatbotId) {
    console.log(chatbotId);
    const db = getDb();
    const chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });
    return chatbot;
}

// Función para eliminar un chatbot por su ID
async function deleteChatbot(chatbotId) {
    const db = getDb();
    const result = await db.collection('chatbots').deleteOne({ _id: ObjectId(chatbotId) });

    if (result.deletedCount === 1) {
        return true; 
    } else {
        return false; // No se encontró el chatbot con el ID especificado
    }
}


async function updateChatbot(chatbotId, updates) {
    const db = getDb();

    const result = await db.collection('chatbots').updateOne(
        { _id: ObjectId(chatbotId) },
        { $set: updates }
    );

    if (result.modifiedCount === 1) {
        return true;
    } else {
        return false;
    }
}


async function linkQuestionnaire(chatbotId, questionnaireId) {
    const db = getDb();

    try {
        const chatbotObjectId = ObjectId(chatbotId);
        const questionnaireObjectId = ObjectId(questionnaireId);

        const result = await db.collection('chatbots').updateOne(
            { _id: chatbotObjectId },
            { $push: { linkedQuestionnaires: questionnaireObjectId } }
        );

        if (result.modifiedCount === 1) {
            return true;
        } else {
            return false; // No se encontró el chatbot con el ID especificado
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function unlinkQuestionnaire(chatbotId, questionnaireId) {
    const db = getDb();

    try {
        const chatbotObjectId = ObjectId(chatbotId);
        const questionnaireObjectId = ObjectId(questionnaireId);

        const result = await db.collection('chatbots').updateOne(
            { _id: chatbotObjectId },
            { $pull: { linkedQuestionnaires: questionnaireObjectId } }
        );

        if (result.modifiedCount === 1) {
            return true;
        } else {
            return false; // No se encontró el chatbot con el ID especificado
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function getLinkedQuestionnaires(chatbotId) {
    try {
        const db = getDb();

        const chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });

        return chatbot.linkedQuestionnaires || [];
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener los cuestionarios vinculados al chatbot');
    }
}

async function getChatbotsByQuestionnaireId(questionnaireId) {
    try {
        const db = getDb();
        const chatbots = await db.collection('chatbots').find({ linkedQuestionnaires: ObjectId(questionnaireId) }).toArray();
        return chatbots;
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener los chatbots vinculados al cuestionario');
    }
}




module.exports = {
    createChatbot,
    getChatbotsByUserId,
    getChatbotById,
    deleteChatbot,
    updateChatbot,
    linkQuestionnaire,
    unlinkQuestionnaire,
    getLinkedQuestionnaires,
    getChatbotsByQuestionnaireId
};


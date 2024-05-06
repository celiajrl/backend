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

// En chatbotController.js
async function deleteChatbot(chatbotId) {
    const db = getDb();

    try {
        const activeCheck = await db.collection('active').findOne({ chatbotId: chatbotId });
        if (activeCheck) {
            return { status: 400, message: 'Cannot delete chatbot as it is part of an active test.' };
        }

        const completeCheck = await db.collection('complete').findOne({ chatbotId: chatbotId });
        if (completeCheck) {
            return { status: 400, message: 'Cannot delete chatbot as it has completed tests.' };
        }

        const result = await db.collection('chatbots').deleteOne({ _id: ObjectId(chatbotId) });
        if (result.deletedCount === 0) {
            return { status: 404, message: 'No chatbot found with that ID' };
        }

        return { status: 200, message: 'Chatbot deleted successfully' };
    } catch (error) {
        console.error('Error deleting chatbot:', error);
        throw new Error('Failed to delete chatbot due to internal server error.');
    }
}





async function updateChatbot(chatbotId, updates) {
    const db = getDb();

    const result = await db.collection('chatbots').updateOne(
        { _id: ObjectId(chatbotId) },
        { $set: updates }
    );

    return true;

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

async function getOrder(chatbotId) {
    try {
        const db = getDb();

        const chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });

        return chatbot.orderData || [];
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener el orden de los cuestionarios');
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
    getOrder,
    getChatbotsByQuestionnaireId
};


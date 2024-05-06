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

async function deleteChatbot(chatbotId) {
    const db = getDb();

    try {
        // Comprobar si el chatbot está en 'active'
        const isActive = await db.collection('active').findOne({ chatbotId: chatbotId });
        if (isActive) {
            return { success: false, status: 400, message: 'Cannot delete chatbot as it is part of an active test.' };
        }

        // Comprobar si el chatbot está en 'complete'
        const isComplete = await db.collection('complete').findOne({ chatbotId: chatbotId });
        if (isComplete) {
            return { success: false, status: 400, message: 'Cannot delete chatbot as it has completed tests.' };
        }

        // Si no está en 'active' ni en 'complete', proceder a eliminar
        const result = await db.collection('chatbots').deleteOne({ _id: ObjectId(chatbotId) });
        if (result.deletedCount === 0) {
            return { success: false, status: 404, message: 'No chatbot found with that ID' };
        } else {
            return { success: true, status: 200, message: 'Chatbot deleted successfully' };
        }
    } catch (err) {
        console.error('Error deleting chatbot:', err);
        return { success: false, status: 500, message: 'Could not delete chatbot' };
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


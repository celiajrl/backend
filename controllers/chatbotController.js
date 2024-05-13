/**
 * chatbotController.js
 *
 * Descripción: Este módulo contiene las funciones necesarias para la gestión de chatbots en la base de datos.
 *              Proporciona funcionalidades para crear, actualizar, eliminar, y consultar información de chatbots,
 *              así como gestionar su relación con cuestionarios. Estas funciones facilitan la interacción con la
 *              colección de chatbots en la base de datos MongoDB.
 *
 * Año: 2024
 *
 * Autora: Celia Jiménez
 */
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');

/**
 * Crea un nuevo chatbot en la base de datos y devuelve el ID del chatbot insertado.
 */
async function createChatbot(chatbotData) {
    const db = getDb();
    const result = await db.collection('chatbots').insertOne(chatbotData);
    return result.insertedId;
}

/**
 * Obtiene todos los chatbots asociados a un ID de usuario específico.
 */
async function getChatbotsByUserId(userId) {
    const db = getDb();
    const chatbots = await db.collection('chatbots').find({ userId }).toArray();
    return chatbots;
}

/**
 * Obtiene un chatbot por su ID.
 */
async function getChatbotById(chatbotId) {
    const db = getDb();
    const chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });
    return chatbot;
}

/**
 * Elimina un chatbot por su ID. Verifica si el chatbot está activo o ha completado pruebas
 * antes de permitir la eliminación.
 */
async function deleteChatbot(chatbotId) {
    const db = getDb();
    try {
        const activeCheck = await db.collection('active').findOne({ chatbotId });
        if (activeCheck) {
            return { status: 400, message: 'Cannot delete chatbot as it is part of an active test.' };
        }

        const completeCheck = await db.collection('complete').findOne({ chatbotId });
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

/**
 * Actualiza la información de un chatbot dado su ID.
 */
async function updateChatbot(chatbotId, updates) {
    const db = getDb();
    const result = await db.collection('chatbots').updateOne({ _id: ObjectId(chatbotId) }, { $set: updates });
    return result.modifiedCount === 1;
}

/**
 * Vincula un cuestionario a un chatbot existente.
 */
async function linkQuestionnaire(chatbotId, questionnaireId) {
    const db = getDb();
    try {
        const result = await db.collection('chatbots').updateOne(
            { _id: ObjectId(chatbotId) },
            { $push: { linkedQuestionnaires: ObjectId(questionnaireId) } }
        );
        return result.modifiedCount === 1;
    } catch (error) {
        console.error(error);
        return false;
    }
}

/**
 * Desvincula un cuestionario de un chatbot existente.
 */
async function unlinkQuestionnaire(chatbotId, questionnaireId) {
    const db = getDb();
    try {
        const result = await db.collection('chatbots').updateOne(
            { _id: ObjectId(chatbotId) },
            { $pull: { linkedQuestionnaires: ObjectId(questionnaireId) } }
        );
        return result.modifiedCount === 1;
    } catch (error) {
        console.error(error);
        return false;
    }
}

/**
 * Obtiene la lista de cuestionarios vinculados a un chatbot.
 */
async function getLinkedQuestionnaires(chatbotId) {
    const db = getDb();
    const chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });
    return chatbot.linkedQuestionnaires || [];
}

/**
 * Obtiene el orden de presentación de los cuestionarios vinculados a un chatbot.
 */
async function getOrder(chatbotId) {
    const db = getDb();
    const chatbot = await db.collection('chatbots').findOne({ _id: ObjectId(chatbotId) });
    return chatbot.orderData || [];
}

/**
 * Obtiene todos los chatbots que tienen un cuestionario específico vinculado.
 */
async function getChatbotsByQuestionnaireId(questionnaireId) {
    const db = getDb();
    const chatbots = await db.collection('chatbots').find({ linkedQuestionnaires: ObjectId(questionnaireId) }).toArray();
    return chatbots;
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

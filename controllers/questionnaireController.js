/**
 * questionnaireController.js
 *
 * Descripción: Este módulo contiene las funciones para manejar las operaciones relacionadas con los cuestionarios
 *              en la base de datos. Incluye funcionalidades para crear, obtener, actualizar y eliminar cuestionarios,
 *              así como para consultar detalles específicos de los cuestionarios en función del usuario o de manera
 *              independiente.
 *
 * Año: 2024
 *
 * Autora: Celia Jiménez
 */

const { ObjectId } = require('mongodb');
const { getDb } = require('../db');

/**
 * Crea un cuestionario y guarda en la base de datos, devuelve el ID del cuestionario insertado.
 */
async function createQuestionnaire(questionnaireData) {
    const db = getDb();
    const result = await db.collection('questionnaires').insertOne(questionnaireData);
    return result.insertedId;
}

/**
 * Obtiene todos los cuestionarios creados por un usuario específico.
 */
async function getQuestionnairesByUserId(userId) {
    const db = getDb();
    const questionnaires = await db.collection('questionnaires').find({ userId }).toArray();
    return questionnaires;
}

/**
 * Obtiene la información detallada de un cuestionario específico, incluyendo la verificación de que pertenece
 * al usuario solicitante.
 */
async function getQuestionnaireInfo(userId, questionnaireId) {
    const db = getDb();
    try {
        const questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId), userId: userId });
        return questionnaire;
    } catch (error) {
        console.error('Error al obtener el cuestionario:', error);
        throw new Error('Error al obtener el cuestionario');
    }
}

/**
 * Obtiene la información de un cuestionario sin necesidad de validar el usuario.
 */
async function getQuestionnaireInfoWOUser(questionnaireId) {
    const db = getDb();
    try {
        const questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId)});
        return questionnaire;
    } catch (error) {
        console.error('Error al obtener el cuestionario:', error);
        throw new Error('Error al obtener el cuestionario');
    }
}

/**
 * Elimina un cuestionario específico tras verificar que no está activo ni ha completado instancias.
 */
async function deleteQuestionnaire(questionnaireId) {
    const db = getDb();

    try {
        const questionnaireObjectId = ObjectId(questionnaireId);
        const active = await db.collection('active').findOne({
            questionnaires: { $elemMatch: { $eq: questionnaireObjectId } }
        });
        if (active) {
            return { success: false, status: 400, message: 'Cannot delete questionnaire as it is part of an active test.' };
        }

        const complete = await db.collection('complete').findOne({ questionnaireId: questionnaireId });
        if (complete) {
            return { success: false, status: 400, message: 'Cannot delete questionnaire as it has completed instances.' };
        }

        const results = await db.collection('results').findOne({ questionnaireId: questionnaireId });
        if (results) {
            return { success: false, status: 400, message: 'Cannot delete questionnaire as it has associated results.' };
        }

        const result = await db.collection('questionnaires').deleteOne({ _id: questionnaireObjectId });
        if (result.deletedCount === 0) {
            return { success: false, status: 404, message: 'No questionnaire found with that ID' };
        } else {
            return { success: true, status: 200, message: 'Questionnaire deleted successfully' };
        }
    } catch (error) {
        console.error('Error deleting questionnaire:', error);
        return { success: false, status: 500, message: 'Internal Server Error' };
    }
}

/**
 * Actualiza la información de un cuestionario dado su ID.
 */
async function updateQuestionnaire(questionnaireId, updates) {
    const db = getDb();

    const result = await db.collection('questionnaires').updateOne(
        { _id: ObjectId(questionnaireId) },
        { $set: updates }
    );

    return result.modifiedCount === 1;
}

module.exports = {
    createQuestionnaire,
    getQuestionnairesByUserId,
    deleteQuestionnaire,
    updateQuestionnaire,
    getQuestionnaireInfo,
    getQuestionnaireInfoWOUser
};

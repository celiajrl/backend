const { ObjectId } = require('mongodb');
const { getDb } = require('../db');


async function createQuestionnaire(questionnaireData) {
    const db = getDb();
    const result = await db.collection('questionnaires').insertOne(questionnaireData);
    return result.insertedId;
}

async function getQuestionnairesByUserId(userId) {
    const db = getDb();
    const questionnaires = await db.collection('questionnaires').find({ userId }).toArray();
    return questionnaires;
}

async function getQuestionnaireInfo(userId, questionnaireId) {
    const db = getDb();
    try {
        const questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId), userId: userId });
        return questionnaire;
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener el cuestionario');
    }
}

async function getQuestionnaireInfoWOUser(questionnaireId) {
    const db = getDb();
    try {
        const questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId)});
        return questionnaire;
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener el cuestionario');
    }
}

async function deleteQuestionnaire(questionnaireId) {
    const db = getDb();

    try {
        // Convertir string a ObjectId
        const questionnaireObjectId = ObjectId(questionnaireId);

        // Comprobar si el cuestionario está en 'active'
        // Asegurándonos de buscar correctamente dentro de un array de ObjectId
        const active = await db.collection('active').findOne({
            questionnaires: { $elemMatch: { $eq: questionnaireObjectId } }
        });
        if (active) {
            return { success: false, status: 400, message: 'Cannot delete questionnaire as it is part of an active test.' };
        }

        // Comprobar si el cuestionario está en 'complete'
        const complete = await db.collection('complete').findOne({ questionnaireId: questionnaireId });
        if (complete) {
            return { success: false, status: 400, message: 'Cannot delete questionnaire as it has completed instances.' };
        }

        // Comprobar si el cuestionario tiene resultados asociados en 'results'
        const results = await db.collection('results').findOne({ questionnaireId: questionnaireId });
        if (results) {
            return { success: false, status: 400, message: 'Cannot delete questionnaire as it has associated results.' };
        }

        // Si no está en 'active', 'complete', ni tiene resultados asociados, proceder a eliminar
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

async function updateQuestionnaire(questionnaireId, updates) {
    const db = getDb();

    const result = await db.collection('questionnaires').updateOne(
        { _id: ObjectId(questionnaireId) },
        { $set: updates }
    );

    if (result.modifiedCount === 1) {
        return true;
    } else {
        return false;
    }
}



module.exports = {
    createQuestionnaire,
    getQuestionnairesByUserId,
    deleteQuestionnaire,
    updateQuestionnaire,
    getQuestionnaireInfo,
    getQuestionnaireInfoWOUser
};

import {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject
} from "./service.js";

export async function createSubjectController(
  req,
  res
) {
  try {
    const {
      name,
      color,
      icon
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Subject name required"
      });
    }

    const subject = await createSubject(
      req.user.id,
      name,
      color,
      icon
    );

    res.status(201).json(subject);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to create subject"
    });
  }
}

export async function getSubjectsController(
  req,
  res
) {
  try {
    const subjects = await getSubjects(
      req.user.id
    );

    res.json(subjects);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch subjects"
    });
  }
}

export async function updateSubjectController(
  req,
  res
) {
  try {
    const subject = await updateSubject(
      req.user.id,
      req.params.id,
      req.body.name,
      req.body.color,
      req.body.icon
    );

    res.json(subject);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update subject"
    });
  }
}

export async function deleteSubjectController(
  req,
  res
) {
  try {
    await deleteSubject(
      req.user.id,
      req.params.id
    );

    res.json({
      success: true
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to delete subject"
    });
  }
}

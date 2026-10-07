from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Task, TaskList, User, now
from ..schemas import ListCreate, ListOut, ListUpdate, TaskCreate, TaskOut, TaskUpdate
from ..security import current_user

router = APIRouter(tags=["data"])


def _own_list(db: Session, user: User, list_id: int) -> TaskList:
    lst = db.get(TaskList, list_id)
    if lst is None or lst.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "List not found")
    return lst


def _own_task(db: Session, user: User, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


# --- Lists ------------------------------------------------------------------


@router.get("/lists", response_model=list[ListOut])
def get_lists(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(TaskList).where(TaskList.user_id == user.id).order_by(TaskList.id)
    ).all()


@router.post("/lists", response_model=ListOut, status_code=status.HTTP_201_CREATED)
def create_list(
    body: ListCreate, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    lst = TaskList(user_id=user.id, **body.model_dump())
    db.add(lst)
    db.commit()
    return lst


@router.put("/lists/{list_id}", response_model=ListOut)
def update_list(
    list_id: int,
    body: ListUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    lst = _own_list(db, user, list_id)
    lst.encrypted_data = body.encrypted_data
    lst.data_decryption_nonce = body.data_decryption_nonce
    lst.updated_at = now()
    db.commit()
    return lst


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    db.delete(_own_list(db, user, list_id))
    db.commit()


# --- Tasks ------------------------------------------------------------------


TRASH_RETENTION = timedelta(days=30)


@router.get("/tasks", response_model=list[TaskOut])
def get_tasks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Like ente, items in the trash are permanently deleted after 30 days.
    db.execute(
        delete(Task).where(
            Task.user_id == user.id,
            Task.is_trashed.is_(True),
            Task.trashed_at < now() - TRASH_RETENTION,
        )
    )
    db.commit()
    return db.scalars(
        select(Task).where(Task.user_id == user.id).order_by(Task.id)
    ).all()


@router.post("/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    _own_list(db, user, body.list_id)
    task = Task(user_id=user.id, **body.model_dump())
    db.add(task)
    db.commit()
    return task


@router.put("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    body: TaskUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    task = _own_task(db, user, task_id)
    _own_list(db, user, body.list_id)
    task.list_id = body.list_id
    task.encrypted_data = body.encrypted_data
    task.decryption_nonce = body.decryption_nonce
    task.updated_at = now()
    db.commit()
    return task


@router.post("/tasks/{task_id}/trash", response_model=TaskOut)
def trash_task(
    task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    task = _own_task(db, user, task_id)
    task.is_trashed = True
    task.trashed_at = now()
    task.updated_at = now()
    db.commit()
    return task


@router.post("/tasks/{task_id}/restore", response_model=TaskOut)
def restore_task(
    task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    task = _own_task(db, user, task_id)
    task.is_trashed = False
    task.trashed_at = None
    task.updated_at = now()
    db.commit()
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    db.delete(_own_task(db, user, task_id))
    db.commit()


@router.post("/trash/empty", status_code=status.HTTP_204_NO_CONTENT)
def empty_trash(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(Task).where(Task.user_id == user.id, Task.is_trashed.is_(True)))
    db.commit()

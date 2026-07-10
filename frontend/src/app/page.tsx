"use client";

import { FormEvent, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { getDownloadUrl } from "./api";
import { formatDate, formatSize, getLevelVariant, getProcessingVariant } from "./formatters";
import { useFileData } from "./useFileData";

export default function Page() {
  const {
    files,
    alerts,
    isLoading,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    loadData,
    uploadFile,
  } = useFileData();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !selectedFile) {
      setErrorMessage("Укажите название и выберите файл");
      return;
    }

    const uploaded = await uploadFile(title.trim(), selectedFile);
    if (uploaded) {
      setShowModal(false);
      setTitle("");
      setSelectedFile(null);
    }
  }

  return (
    <Container fluid className="py-4 px-4 bg-light min-vh-100">
      <Row className="justify-content-center">
        <Col xxl={10} xl={11}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <h1 className="h3 mb-2">Управление файлами</h1>
                  <p className="text-secondary mb-0">
                    Загрузка файлов, просмотр статусов обработки и ленты алертов.
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" onClick={() => void loadData()}>
                    Обновить
                  </Button>
                  <Button variant="primary" onClick={() => setShowModal(true)}>
                    Добавить файл
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          {errorMessage ? (
            <Alert variant="danger" className="shadow-sm">
              {errorMessage}
            </Alert>
          ) : null}

          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="h5 mb-0">Файлы</h2>
                <Badge bg="secondary">{files.length}</Badge>
              </div>
            </Card.Header>
            <Card.Body className="px-4 pb-4">
              {isLoading ? (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover bordered className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Название</th>
                        <th>Файл</th>
                        <th>MIME</th>
                        <th>Размер</th>
                        <th>Статус</th>
                        <th>Проверка</th>
                        <th>Создан</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-secondary">
                            Файлы пока не загружены
                          </td>
                        </tr>
                      ) : (
                        files.map((file) => (
                          <tr key={file.id}>
                            <td>
                              <div className="fw-semibold">{file.title}</div>
                              <div className="small text-secondary">{file.id}</div>
                            </td>
                            <td>{file.original_name}</td>
                            <td>{file.mime_type}</td>
                            <td>{formatSize(file.size)}</td>
                            <td>
                              <Badge bg={getProcessingVariant(file.processing_status)}>
                                {file.processing_status}
                              </Badge>
                            </td>
                            <td>
                              <div className="d-flex flex-column gap-1">
                                <Badge bg={file.requires_attention ? "warning" : "success"}>
                                  {file.scan_status ?? "pending"}
                                </Badge>
                                <span className="small text-secondary">
                                  {file.scan_details ?? "Ожидает обработки"}
                                </span>
                              </div>
                            </td>
                            <td>{formatDate(file.created_at)}</td>
                            <td className="text-nowrap">
                              <Button
                                as="a"
                                href={getDownloadUrl(file.id)}
                                variant="outline-primary"
                                size="sm"
                              >
                                Скачать
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="h5 mb-0">Алерты</h2>
                <Badge bg="secondary">{alerts.length}</Badge>
              </div>
            </Card.Header>
            <Card.Body className="px-4 pb-4">
              {isLoading ? (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover bordered className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>File ID</th>
                        <th>Уровень</th>
                        <th>Сообщение</th>
                        <th>Создан</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-secondary">
                            Алертов пока нет
                          </td>
                        </tr>
                      ) : (
                        alerts.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td className="small">{item.file_id}</td>
                            <td>
                              <Badge bg={getLevelVariant(item.level)}>{item.level}</Badge>
                            </td>
                            <td>{item.message}</td>
                            <td>{formatDate(item.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Добавить файл</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Название</Form.Label>
              <Form.Control
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например, Договор с подрядчиком"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Файл</Form.Label>
              <Form.Control
                type="file"
                onChange={(event) =>
                  setSelectedFile((event.target as HTMLInputElement).files?.[0] ?? null)
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Загрузка..." : "Сохранить"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

const API_URL =
  process.env.NEXT_PUBLIC_VYRRA_API_URL ??
  "http://localhost:8000/api/v1";

export type UploadedImage = {
  filename: string;
  contentType: string;
};

type UploadImageResponse = {
  filename: string;
  content_type: string;
};

export async function uploadGenerationImage(
  file: File
): Promise<UploadedImage> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/uploads/image`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let message = "Unable to upload image.";

    try {
      const body = await response.json();

      if (
        body &&
        typeof body.detail === "string"
      ) {
        message = body.detail;
      }
    } catch {
      // Keep fallback message.
    }

    throw new Error(message);
  }

  const data =
    (await response.json()) as UploadImageResponse;

  return {
    filename: data.filename,
    contentType: data.content_type,
  };
}

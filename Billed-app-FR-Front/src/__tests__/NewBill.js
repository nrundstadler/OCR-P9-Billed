/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import toHaveClass from "@testing-library/jest-dom";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";
import userEvent from "@testing-library/user-event";

jest.mock("../app/Store", () => mockStore);

// init onNavigate
const onNavigate = pathname => {
  document.body.innerHTML = ROUTES({ pathname });
};

beforeAll(() => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
      email: "a@a",
    })
  );
});

beforeEach(() => {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);

  router();
});

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then, mail icon in vertical layout should be highlighted", () => {
      window.onNavigate(ROUTES_PATH.NewBill);

      const icon = screen.getByTestId("icon-mail");
      expect(icon).toHaveClass("active-icon");
    });
    test("Then the form should contain 8 fields and a submit button", () => {
      window.onNavigate(ROUTES_PATH.NewBill);

      const inputs = document.querySelectorAll("input, select, textarea");
      const button = screen.getByRole("button");

      expect(inputs).toHaveLength(8);
      expect(button).toBeInTheDocument();
    });
  });

  describe("When I am on NewBill Page and I add a file", () => {
    test("Then the file should be added to the input", () => {
      window.onNavigate(ROUTES_PATH.NewBill);

      const imageInput = screen.getByTestId("file");

      const file = new File(["test"], "test.png", { type: "image/png" });

      fireEvent.change(imageInput, {
        target: {
          files: [file],
        },
      });

      expect(imageInput.files[0]).toBe(file);
    });
  });

  describe("When I am on NewBill Page and I add a wrong format file", () => {
    test("Then an error message should be displayed", () => {
      window.onNavigate(ROUTES_PATH.NewBill);

      const imageInput = screen.getByTestId("file");

      const file = new File(["test"], "test.png", { type: "text/plain" });

      fireEvent.change(imageInput, {
        target: {
          files: [file],
        },
      });

      expect(imageInput.files[0]).toBe(file);

      const errorMessage = screen.getByText("Veuillez télécharger un fichier au format JPEG, JPG ou PNG.");
      expect(errorMessage).toBeTruthy();
    });
  });

  /****************/
  /** POST TESTS **/
  /****************/
  describe("When I am on NewBill Page and submit the form", () => {
    test("Then it should generate a new bill", async () => {
      window.onNavigate(ROUTES_PATH.NewBill);
      jest.spyOn(mockStore.bills(), "update");

      new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const imageInput = screen.getByTestId("file");

      const file = new File(["test"], "test.png", { type: "image/png" });

      fireEvent.change(imageInput, {
        target: {
          files: [file],
        },
      });

      const selectExpenseType = screen.getByTestId("expense-type");
      const inputExpenseName = screen.getByTestId("expense-name");
      const inputDatePicker = screen.getByTestId("datepicker");
      const inputAmount = screen.getByTestId("amount");
      const inputVat = screen.getByTestId("vat");
      const inputPct = screen.getByTestId("pct");
      const textareaCommentary = screen.getByTestId("commentary");

      userEvent.selectOptions(selectExpenseType, "Transports");
      userEvent.type(inputExpenseName, "Test");
      fireEvent.change(inputDatePicker, { target: { value: "2021-09-01" } });
      userEvent.type(inputAmount, "100");
      userEvent.type(inputVat, "20");
      userEvent.type(inputPct, "20");
      userEvent.type(textareaCommentary, "Test");

      const submitButton = screen.getByRole("button");
      userEvent.click(submitButton);

      expect(mockStore.bills().update).toHaveBeenCalled();
      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
    });
  });

  describe("When an error 500 occurs on the API", async () => {
    test("Then, an error message should be displayed in the console", async () => {
      await testApiError(500);
    });
  });

  describe("When an error 404 occurs on the API", async () => {
    test("Then an error message should be displayed in the console", async () => {
      await testApiError(404);
    });
  });
});

/* Utils */
const testApiError = async errorCode => {
  window.onNavigate(ROUTES_PATH.NewBill);

  const submitButton = screen.getByRole("button");

  jest.spyOn(mockStore.bills(), "update").mockRejectedValueOnce(new Error(`Error ${errorCode}`));
  const consoleErrorSpy = jest.spyOn(console, "error");

  userEvent.click(submitButton);

  expect(mockStore.bills().update).toHaveBeenCalled();

  await waitFor(() => {
    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error(`Error ${errorCode}`));
  });

  consoleErrorSpy.mockRestore();
};

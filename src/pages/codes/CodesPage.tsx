import React from "react";

import { FooterRow } from "../../components/FooterRow";
import { Header } from "../../components/Header";
import { Codes } from "./Codes";

export function CodesPage(): JSX.Element {
  return (
    <div className="page">
      <Header />

      <div className="container mt-3">
        <div className="card">
          <div className="row">
            <div className="col">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item active" aria-current="page">
                    Codes
                  </li>
                </ol>
              </nav>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <Codes />
            </div>
          </div>
          <FooterRow />
        </div>
      </div>
    </div>
  );
}
